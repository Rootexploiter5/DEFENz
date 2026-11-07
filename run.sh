#!/usr/bin/env bash
# Single-command launcher for Linux environments

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[0;36m=================================================================\033[0m"
echo -e "\033[0;32m         DEFENx Autonomous On-Device EDR Orchestrator            \033[0m"
echo -e "\033[0;36m=================================================================\033[0m"

# 1. Setup Python venv if missing
if [ ! -d "$ROOT_DIR/backend/.venv" ]; then
    echo -e "\033[0;33m[*] Creating backend virtual environment...\033[0m"
    python3 -m venv "$ROOT_DIR/backend/.venv"
    "$ROOT_DIR/backend/.venv/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt"
fi

# 2. Setup Frontend dependencies if missing
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    echo -e "\033[0;33m[*] Installing frontend node modules...\033[0m"
    npm --prefix "$ROOT_DIR/frontend" install
fi

# Trap to kill background children upon Ctrl+C
trap 'kill 0' EXIT

echo -e "\033[0;36m[*] Starting FastAPI Backend on http://127.0.0.1:8000...\033[0m"
"$ROOT_DIR/backend/.venv/bin/python" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &

echo -e "\033[0;36m[*] Starting Next.js Command Center on http://localhost:3000...\033[0m"
npm --prefix "$ROOT_DIR/frontend" run dev &

# 3. Check if eBPF Agent binary exists or can be built
if [ -f "$ROOT_DIR/agent/bin/defenx-agent" ]; then
    echo -e "\033[0;36m[*] Starting eBPF Agent...\033[0m"
    sudo "$ROOT_DIR/agent/bin/defenx-agent" --backend=localhost:8000 &
fi

echo -e "\n\033[0;32m[✓] All services started!\033[0m"
echo -e "    - Command Center: http://localhost:3000"
echo -e "    - Backend Docs:   http://127.0.0.1:8000/docs"
echo -e "\nPress Ctrl+C to terminate all services."

wait

