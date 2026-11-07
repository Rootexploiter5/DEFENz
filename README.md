# AI-Based Behavioral Anomaly Detection (DEFENx)

A privacy-first, on-device autonomous cybersecurity platform and Endpoint Detection and Response (EDR) orchestrator for personal devices. By combining ultra-low-overhead kernel telemetry with local Large Language Models (LLMs) via Ollama, the system detects, analyzes, and mitigates zero-day threats and behavioral anomalies in real-time, completely on-device.

---

## Architecture Overview

The system operates across a 4-tier pipeline:

```
[ Tier 1: Kernel Sensor ]  ──>  [ Tier 2: ML Triage ]  ──>  [ Tier 3: AI Reasoning ]  ──>  [ Tier 4: Command Center ]
 eBPF (C) + Go Daemon            FastAPI + Scikit-Learn      Ollama (Llama 3 / Qwen)       Next.js 14 + Tailwind CSS
 (execve, connect hooks)         (Isolation Forest baseline) (Semantic verdict / JSON)     (3D Node Graph, Chat, Glassmorphism)
```

1. **Tier 1 — Kernel Telemetry (`agent/`)**:
   - Written in C (eBPF) and Go.
   - Hooks into kernel tracepoints (`sys_enter_execve`, `sys_enter_connect`) to extract process executions and network connections via ring buffers.
   - Streams live JSON events over WebSocket/gRPC with near-zero overhead.

2. **Tier 2 — ML Filter & Ingestion (`backend/app/ml_filter/`)**:
   - Built with Python and FastAPI.
   - Manages an Observation Mode (establishing device baselines) and Active Mode.
   - Runs an unsupervised Isolation Forest model to filter high-volume normal events and escalate statistical anomalies (>95th percentile).
   - Persists events in a local SQLite/TimescaleDB time-series database.

3. **Tier 3 — AI Reasoning Engine (`backend/app/ai_engine/`)**:
   - Formulates context-rich forensic prompts containing the anomalous process execution tree.
   - Leverages local RAG (ChromaDB/FAISS) with NVD CVE intelligence.
   - Communicates with a local Ollama instance (`llama3:8b` or `qwen2.5-coder`) using strict JSON schemas to output threat levels and automated response recommendations.

4. **Tier 4 — Interactive Command Center (`frontend/`)**:
   - Modern Next.js 14 App Router dashboard with Tailwind CSS.
   - Glassmorphic dark UI with neon cyan and emerald green accents.
   - Real-time WebSocket telemetry stream (`useTelemetrySocket`).
   - 3D/graphical process tree visualization and interactive AI forensic chat.

---

## Directory Structure

```
ai-anomaly-detector/
├── agent/                  # High-performance telemetry (Go & C)
│   ├── bpf/                # eBPF Kernel Hooks (process_monitor.c, network_monitor.c)
│   ├── cmd/agent/          # Go Daemon entry point (main.go)
│   ├── pkg/collector/      # Ring buffer loader & reader
│   ├── pkg/formatter/      # Normalizes kernel structs to JSON
│   ├── pkg/transmitter/    # Persistent WebSocket/gRPC client
│   ├── go.mod
│   └── Makefile            # bpf2go compilation
│
├── backend/                # AI Orchestrator & ML Filter (Python / FastAPI)
│   ├── app/
│   │   ├── main.py         # FastAPI application entry
│   │   ├── api/            # API endpoints & WebSocket handler
│   │   ├── core/           # Configuration & environment variables
│   │   ├── models/         # Pydantic schemas (Event, Threat, ProcessTree)
│   │   ├── ml_filter/      # Isolation Forest baseline training & scoring
│   │   ├── ai_engine/      # Ollama client, forensic prompts, LLM analyzer
│   │   └── rag/            # Local vector store (ChromaDB) & CVE ingestion
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/               # Command Center (Next.js 14+ App Router)
    ├── app/
    │   ├── page.tsx        # Main dashboard view
    │   ├── layout.tsx      # Global layout & context providers
    │   └── globals.css     # Dark mode glassmorphism styles
    ├── components/         # ThreatAlertCard, ProcessGraph, AIChatDrawer
    └── hooks/              # useTelemetrySocket
```

---

## Getting Started

### Prerequisites
- **Linux Kernel with eBPF support** (Kernel 5.4+) with `clang`, `llvm`, and `libbpf-dev`.
- **Go** (1.21+).
- **Python** (3.10+) with `virtualenv`.
- **Node.js** (18+) & `npm` / `pnpm`.
- **Ollama** installed and running locally with `llama3:8b` or `qwen2.5-coder`.
