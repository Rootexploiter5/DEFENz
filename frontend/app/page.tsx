"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert,
  Activity, 
  Cpu, 
  Network, 
  Terminal, 
  Radio, 
  RefreshCw,
  Search,
  Zap,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { useTelemetrySocket, TelemetryEvent } from "../hooks/useTelemetrySocket";
import { ThreatAlertCard } from "../components/ThreatAlertCard";

export default function DashboardPage() {
  const { events, alerts, isConnected } = useTelemetrySocket();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "execve" | "connect">("all");
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);

  const [healthData, setHealthData] = useState<{
    status: string;
    events_ingested: number;
    anomalies_detected: number;
    model_loaded: boolean;
  }>({
    status: "ACTIVE",
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
        // Backend offline
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesTab = activeTab === "all" ? true : e.event_type === activeTab;
    const matchesQuery = 
      e.comm.toLowerCase().includes(filter.toLowerCase()) ||
      (e.path && e.path.toLowerCase().includes(filter.toLowerCase())) ||
      (e.dest_ip && e.dest_ip.includes(filter)) ||
      String(e.pid).includes(filter);
    return matchesTab && matchesQuery;
  });

  // Set default selected event for inspector
  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0]);
    }
  }, [events, selectedEvent]);

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      {/* Top Cyber Command Header */}
      <header className="border-b border-white/[0.08] backdrop-blur-xl bg-slate-950/60 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#00f5d4] via-[#38bdf8] to-[#8b5cf6] p-[1.5px] shadow-[0_0_25px_rgba(0,245,212,0.3)]">
                <div className="bg-[#05070f] p-2 rounded-[14px]">
                  <Zap className="w-5 h-5 text-[#00f5d4]" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5d4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00f5d4]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wider uppercase gradient-text-cyan-violet">
                  DEFENx
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30 font-semibold tracking-wider">
                  AI EDR v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous Behavioral Anomaly Detection & Kernel Telemetry Orchestrator
              </p>
            </div>
          </div>

          {/* Quick Telemetry Status Badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border-emerald-500/30">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className={isConnected ? "text-emerald-300 font-semibold" : "text-rose-400 font-semibold"}>
                {isConnected ? "KERNEL STREAM: ONLINE" : "STREAM: DISCONNECTED"}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border-[#8b5cf6]/30">
              <Cpu className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-slate-300">
                AI MODEL: <span className="text-[#8b5cf6] font-semibold">{healthData.model_loaded ? "ACTIVE" : "LEARNING"}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Command Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Metric Gradient Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="glass-panel-glow p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00f5d4]/10 rounded-full blur-2xl group-hover:bg-[#00f5d4]/20 transition-all" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Telemetry Events</span>
              <Activity className="w-4 h-4 text-[#00f5d4]" />
            </div>
            <div className="text-3xl font-black font-mono mt-3 text-white">
              {healthData.events_ingested.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-time SQLite storage</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border-[#8b5cf6]/20">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#8b5cf6]/10 rounded-full blur-2xl group-hover:bg-[#8b5cf6]/20 transition-all" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>ML Statistical Deviations</span>
              <ShieldAlert className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            <div className="text-3xl font-black font-mono mt-3 text-[#8b5cf6]">
              {healthData.anomalies_detected}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              &gt;95th percentile Isolation Forest
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border-rose-500/20">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Verified AI Alerts</span>
              <Zap className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black font-mono mt-3 text-rose-400">
              {alerts.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              Ollama forensic verdicts
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border-cyan-500/20">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Memory Sliding Buffer</span>
              <Network className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-black font-mono mt-3 text-cyan-300">
              {events.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              Active streaming events
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (7 cols): AI Forensic Alerts & Deep Event Inspector */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Forensic Alerts Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    AI Forensic Threat Alerts ({alerts.length})
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Ollama Reasoning
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="glass-panel p-8 rounded-2xl text-center border-dashed border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm">System Running Cleanly</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    No active behavioral threats or reverse shells detected. Telemetry is adhering to baseline execution patterns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <ThreatAlertCard key={alert.alert_id} alert={alert} />
                  ))}
                </div>
              )}
            </div>

            {/* Selected Process Telemetry Inspector Card */}
            {selectedEvent && (
              <div className="glass-panel p-5 rounded-2xl border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00f5d4]">
                    <SlidersHorizontal className="w-4 h-4" />
                    Process Forensic Inspector
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                    PID {selectedEvent.pid}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-500 block">BINARY NAME</span>
                    <span className="font-bold text-white truncate block">{selectedEvent.comm}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-500 block">EVENT TYPE</span>
                    <span className="font-bold text-[#00f5d4] uppercase">{selectedEvent.event_type}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-500 block">PARENT PID</span>
                    <span className="font-bold text-slate-300">{selectedEvent.ppid || "N/A"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-500 block">USER ID</span>
                    <span className="font-bold text-slate-300">UID:{selectedEvent.uid}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 break-all">
                  <span className="text-slate-500 select-none">$ </span>
                  {selectedEvent.path || selectedEvent.comm}
                  {selectedEvent.dest_ip && (
                    <span className="text-[#00f5d4]"> ➔ {selectedEvent.dest_ip}:{selectedEvent.dest_port}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Live Telemetry Stream with Tabs & Quick Filters */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00f5d4]" />
                Live Kernel Stream
              </h2>
              <span className="text-[11px] font-mono text-[#00f5d4] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-ping" />
                STREAMING
              </span>
            </div>

            {/* Filter & View Mode Controls */}
            <div className="glass-panel p-3 rounded-2xl space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter PID, process comm, or IP..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f5d4] transition-colors font-mono"
                />
              </div>

              {/* Event Type Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    activeTab === "all" ? "bg-gradient-to-r from-[#00f5d4]/20 to-[#8b5cf6]/20 text-white font-bold border border-white/15" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({events.length})
                </button>
                <button
                  onClick={() => setActiveTab("execve")}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    activeTab === "execve" ? "bg-[#00f5d4]/20 text-[#00f5d4] font-bold border border-[#00f5d4]/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Execve
                </button>
                <button
                  onClick={() => setActiveTab("connect")}
                  className={`flex-1 py-1 rounded-lg transition-all ${
                    activeTab === "connect" ? "bg-[#8b5cf6]/20 text-[#8b5cf6] font-bold border border-[#8b5cf6]/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Connect
                </button>
              </div>
            </div>

            {/* Stream Scroll Container */}
            <div className="glass-panel rounded-2xl p-2.5 h-[520px] overflow-y-auto space-y-2 font-mono text-[11px]">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No telemetry events match your current filter.
                </div>
              ) : (
                filteredEvents.map((ev, i) => {
                  const isSelected = selectedEvent?.pid === ev.pid && selectedEvent?.timestamp === ev.timestamp;
                  return (
                    <div
                      key={`${ev.pid}-${ev.timestamp}-${i}`}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-gradient-to-r from-[#00f5d4]/15 via-transparent to-[#8b5cf6]/10 border-[#00f5d4]/50 shadow-[0_0_15px_rgba(0,245,212,0.15)]"
                          : "bg-slate-950/50 border-white/[0.04] hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400 mb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ev.event_type === "execve" ? "bg-[#00f5d4]" : "bg-[#8b5cf6]"
                            }`}
                          />
                          {ev.comm}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-slate-300">
                          PID:{ev.pid}
                        </span>

                        {ev.event_type === "execve" ? (
                          <span className="truncate max-w-[180px] text-slate-400" title={ev.path}>
                            {ev.path}
                          </span>
                        ) : (
                          <span className="text-cyan-300">
                            {ev.dest_ip}:{ev.dest_port}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
