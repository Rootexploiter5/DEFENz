"use client";

import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Activity, Terminal } from "lucide-react";
import { ThreatAlert } from "../hooks/useTelemetrySocket";
import { ProcessGraph } from "./ProcessGraph";
import { AIChatDrawer } from "./AIChatDrawer";

interface ThreatAlertCardProps {
  alert: ThreatAlert;
}

export const ThreatAlertCard: React.FC<ThreatAlertCardProps> = ({ alert }) => {
  const [expanded, setExpanded] = useState(true);
  const [showChat, setShowChat] = useState(false);

  const isCritical = alert.threat_level === "Critical" || alert.threat_level === "High";

  return (
    <div
      className={`rounded-xl transition-all duration-300 p-5 ${
        isCritical ? "glass-panel-danger" : "glass-panel"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border ${
              isCritical
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-amber-500/20 border-amber-500/40 text-amber-400"
            }`}
          >
            {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm tracking-wide">
                {alert.threat_level.toUpperCase()} SEVERITY ANOMALY: {alert.trigger_comm}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                PID {alert.trigger_pid}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Detected at {new Date(alert.timestamp).toLocaleTimeString()} • Anomaly Score:{" "}
              <span className="font-bold text-[#00f5d4]">{(alert.anomaly_score * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 hover:border-[#00f5d4] text-slate-300 hover:text-[#00f5d4] transition-colors"
          >
            {showChat ? "Close Chat" : "AI Interrogate"}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Analysis & Verdict */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs leading-relaxed text-slate-300">
            <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00f5d4]" />
              Forensic LLM Analysis
            </div>
            {alert.analysis}
          </div>

          {/* Action Recommendation */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Recommended Action:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                alert.recommended_action === "KILL_PROCESS"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {alert.recommended_action}
            </span>
          </div>

          {/* Process Execution Graph */}
          <ProcessGraph tree={alert.process_tree} triggerPid={alert.trigger_pid} />

          {/* Interactive AI Chat */}
          {showChat && <AIChatDrawer alert={alert} />}
        </div>
      )}
    </div>
  );
};

