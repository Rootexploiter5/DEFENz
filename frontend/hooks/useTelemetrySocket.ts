"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface TelemetryEvent {
  timestamp: string;
  event_type: "execve" | "connect";
  pid: number;
  ppid?: number;
  uid: number;
  comm: string;
  path?: string;
  dest_ip?: string;
  dest_port?: number;
  protocol?: string;
}

export interface ProcessNode {
  pid: number;
  ppid: number;
  comm: string;
  path?: string;
  timestamp: string;
}

export interface ProcessTree {
  root_pid: number;
  nodes: ProcessNode[];
  tree_text: string;
}

export interface ThreatAlert {
  alert_id: string;
  timestamp: string;
  trigger_pid: number;
  trigger_comm: string;
  anomaly_score: number;
  threat_level: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  analysis: string;
  recommended_action: string;
  process_tree: ProcessTree;
  dest_ip?: string;
  dest_port?: number;
}

export function useTelemetrySocket(
  backendWsUrl: string = "ws://localhost:8000/ws/frontend",
  backendHttpUrl: string = "http://localhost:8000"
) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Initial load: Fetch stored events from SQLite immediately upon page render
  useEffect(() => {
    const fetchInitialTelemetry = async () => {
      try {
        const res = await fetch(`${backendHttpUrl}/api/telemetry/recent?limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setEvents(data.events);
          }
        }
      } catch (e) {
        console.debug("Could not pre-fetch recent telemetry:", e);
      }
    };
    fetchInitialTelemetry();
  }, [backendHttpUrl]);

  const sendMessage = useCallback((msg: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg);
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(backendWsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "TELEMETRY_EVENT" && payload.data) {
            setEvents((prev) => [payload.data, ...prev.slice(0, 99)]);
          } else if (payload.type === "AI_ALERT_TRIGGERED" && payload.alert) {
            setAlerts((prev) => [payload.alert, ...prev]);
          }
        } catch (err) {
          console.error("[useTelemetrySocket] Error parsing message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [backendWsUrl]);

  return { events, alerts, isConnected, sendMessage };
}

