"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Bot, User, ShieldCheck } from "lucide-react";
import { ThreatAlert } from "../hooks/useTelemetrySocket";

interface AIChatDrawerProps {
  alert: ThreatAlert;
  backendUrl?: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ alert, backendUrl = "http://localhost:8000" }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: `Forensic session initialized for PID ${alert.trigger_pid} (${alert.trigger_comm}). Threat verdict: ${alert.threat_level}. How can I assist with your investigation?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsLoading(true);

    try {
      // Query local Ollama via backend AI interrogation endpoint
      const response = await fetch(`${backendUrl}/api/ai/interrogate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: alert.trigger_pid, user_query: userText }),
      });
      const data = await response.json();
      
      setMessages((prev) => [...prev, { sender: "ai", text: data.reply || "No response received from AI engine." }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Unable to retrieve real-time forensic context. Ensure DEFENx backend is running." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-800/80 pt-4 flex flex-col h-72">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
        <MessageSquare className="w-3.5 h-3.5 text-[#00f5d4]" />
        Interactive AI Forensic Interrogation
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 font-mono text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 items-start ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "ai" && <Bot className="w-4 h-4 text-[#00f5d4] shrink-0 mt-0.5" />}
            <div
              className={`p-2.5 rounded-lg max-w-[85%] leading-relaxed ${
                m.sender === "user"
                  ? "bg-[#00f5d4]/10 text-cyan-200 border border-[#00f5d4]/30"
                  : "bg-slate-900/90 text-slate-300 border border-slate-800"
              }`}
            >
              {m.text}
            </div>
            {m.sender === "user" && <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 items-center text-xs text-slate-500 italic">
            <Bot className="w-4 h-4 text-[#00f5d4] animate-spin" />
            DEFENx AI reasoning over execution trace...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask forensic questions (e.g. 'Analyze binary arguments', 'Is port safe?')..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#00f5d4] transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-[#00f5d4]/20 hover:bg-[#00f5d4]/30 text-[#00f5d4] border border-[#00f5d4]/40 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Query
        </button>
      </form>
    </div>
  );
};

