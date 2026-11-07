"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Network, 
  Terminal, 
  Radio, 
  RefreshCw,
  Search,
  Zap
} from "lucide-react";
import { useTelemetrySocket, TelemetryEvent } from "../hooks/useTelemetrySocket";
import { ThreatAlertCard } from "../components/ThreatAlertCard";

export default function DashboardPage() {
  const { events, alerts, isConnected } = useTelemetrySocket();
  const [filter, setFilter] = useState("");
  const [healthData, setHealthData] = useState<{
    status: string;
    events_ingested: number;
    anomalies_detected: number;
    model_loaded: boolean;
  }>({
    status: "DISCONNECTED",
    events_ingested: 0,
    anomalies_detected: 0,
    model_loaded: false,
  });

  // Poll backend health stats
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealthData(data);
        }
      } catch {
        // Backend not reachable yet
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.comm.toLowerCase().includes(filter.toLowerCase()) ||
      (e.path && e.path.toLowerCase().includes(filter.toLowerCase())) ||
      (e.dest_ip && e.dest_ip.includes(filter))
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-6 space-y-6">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00f5d4]/10 border border-[#00f5d4]/30 shadow-[0_0_20px_rgba(0,245,212,0.15)]">
            <Zap className="w-6 h-6 text-[#00f5d4]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white">
              DEFENx <span className="text-[#00f5d4] font-mono text-sm font-semibold">EDR</span>
            </h1>
            <p className="text-xs text-slate-400">
              Autonomous On-Device Behavioral Anomaly Detection & Incident Response
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel">
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnected ? "text-[#10b981] animate-pulse" : "text-rose-500"
              }`}
            />
            <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
              {isConnected ? "AGENT STREAM LIVE" : "DISCONNECTED"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel">
            <Cpu className="w-3.5 h-3.5 text-[#00f5d4]" />
            <span>ML BASELINE: {healthData.model_loaded ? "ACTIVE" : "LEARNING"}</span>
          </div>
        </div>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Events Logged</span>
            <Activity className="w-4 h-4 text-[#00f5d4]" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-white">
            {healthData.events_ingested.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Live SQLite time-series storage</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Deviations Flagged</span>
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-[#10b981]">
            {healthData.anomalies_detected}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">>95th percentile ML scores</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active AI Alerts</span>
            <RefreshCw className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-[#f59e0b]">
            {alerts.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Ollama verified incidents</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>In-Memory Stream</span>
            <Network className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-cyan-300">
            {events.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Sliding buffer capacity 100</div>
        </div>
      </div>

      {/* Main Content Layout: Left Alerts, Right Live Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Forensic Alerts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00f5d4]" />
              Forensic AI Alerts ({alerts.length})
            </h2>
          </div>

          {alerts.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl text-center text-slate-400 text-xs">
              <ShieldCheck className="w-8 h-8 text-[#10b981] mx-auto mb-2 opacity-80" />
              No active security deviations detected. Endpoint operating normally within baseline.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <ThreatAlertCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Kernel Telemetry Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#00f5d4]" />
              Live Kernel Telemetry
            </h2>
          </div>

          {/* Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by comm, path, or IP..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f5d4] font-mono"
            />
          </div>

          {/* Telemetry Stream View */}
          <div className="glass-panel rounded-xl p-3 h-[580px] overflow-y-auto space-y-2 font-mono text-[11px]">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Awaiting kernel telemetry events from Go daemon...
              </div>
            ) : (
              filteredEvents.map((ev, i) => (
                <div
                  key={`${ev.pid}-${ev.timestamp}-${i}`}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ev.event_type === "execve" ? "bg-[#00f5d4]" : "bg-cyan-400"
                        }`}
                      />
                      {ev.comm}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">
                      PID:{ev.pid}
                    </span>
                    {ev.event_type === "execve" ? (
                      <span className="truncate text-slate-400" title={ev.path}>
                        exec: {ev.path}
                      </span>
                    ) : (
                      <span className="text-cyan-300">
                        connect: {ev.dest_ip}:{ev.dest_port}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

