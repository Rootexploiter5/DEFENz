"use client";

import React from "react";
import { ProcessTree, ProcessNode } from "../hooks/useTelemetrySocket";
import { GitBranch, Terminal, ShieldAlert, Cpu } from "lucide-react";

interface ProcessGraphProps {
  tree: ProcessTree;
  triggerPid: number;
}

export const ProcessGraph: React.FC<ProcessGraphProps> = ({ tree, triggerPid }) => {
  if (!tree || !tree.nodes || tree.nodes.length === 0) {
    return (
      <div className="p-4 text-xs font-mono text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800">
        No parent process chain detected in telemetry window.
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-mono text-xs overflow-x-auto">
      <div className="flex items-center gap-2 mb-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
        <GitBranch className="w-4 h-4 text-[#00f5d4]" />
        Execution Flow & Lineage (Parent ➔ Child)
      </div>

      <div className="flex items-center gap-3 py-2">
        {tree.nodes.map((node: ProcessNode, index: number) => {
          const isTrigger = node.pid === triggerPid;
          return (
            <React.Fragment key={`${node.pid}-${index}`}>
              <div
                className={`relative flex flex-col p-3 rounded-lg border transition-all duration-200 min-w-[170px] ${
                  isTrigger
                    ? "bg-rose-950/40 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-rose-200"
                    : "bg-slate-900/70 border-slate-700/60 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold truncate text-[13px] flex items-center gap-1.5">
                    {isTrigger ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    {node.comm}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isTrigger ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    PID:{node.pid}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={node.path || ""}>
                  Path: {node.path || "kernel/daemon"}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  PPID: {node.ppid}
                </div>
              </div>

              {index < tree.nodes.length - 1 && (
                <div className="flex items-center text-[#00f5d4] shrink-0">
                  <span className="text-lg font-bold">➔</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <span className="text-slate-500">Chain: </span>
        <span className="text-[#00f5d4]">{tree.tree_text}</span>
      </div>
    </div>
  );
};
