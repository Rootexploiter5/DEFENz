"""
Windows Endpoint Telemetry Collector for DEFENx.
Streams real-time process execution and network connection events to the FastAPI backend
on Windows using psutil / WMI / native Windows syscall polling.
Provides cross-platform parity with the Linux eBPF agent.
"""

import asyncio
import json
import logging
import os
import sys
import time
import psutil
import websockets
from datetime import datetime, timezone
import urllib.parse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [WindowsAgent] %(message)s")
logger = logging.getLogger("defenx.windows_agent")

BACKEND_HOST = os.environ.get("DEFENX_BACKEND_HOST", "127.0.0.1:8000")
AUTH_TOKEN = os.environ.get("DEFENX_AUTH_TOKEN", "defenx-internal-local-token")
WS_URL = f"ws://{BACKEND_HOST}/ws/agent?token={urllib.parse.quote(AUTH_TOKEN)}"

known_pids = set()

def get_process_events():
    """Captures new process creation events on Windows."""
    global known_pids
    current_pids = set(psutil.pids())
    new_pids = current_pids - known_pids
    
    events = []
    current_time = datetime.now(timezone.utc).isoformat()

    for pid in new_pids:
        try:
            p = psutil.Process(pid)
            comm = p.name()
            ppid = p.ppid()
            try:
                exe = p.exe()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                exe = comm
            try:
                uids = p.uids()
                uid = uids.real if hasattr(uids, 'real') else 1000
            except Exception:
                uid = 1000

            event = {
                "timestamp": current_time,
                "event_type": "execve",
                "pid": pid,
                "ppid": ppid,
                "uid": uid,
                "comm": comm,
                "path": exe,
                "args": p.cmdline() if hasattr(p, 'cmdline') else [comm],
                "metadata": {"os": "windows"}
            }
            events.append(event)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    known_pids = current_pids
    return events

def get_network_events():
    """Captures active outbound network connection events on Windows."""
    events = []
    current_time = datetime.now(timezone.utc).isoformat()

    try:
        connections = psutil.net_connections(kind="inet")
        for conn in connections:
            if conn.status == "ESTABLISHED" and conn.raddr and conn.pid:
                try:
                    proc = psutil.Process(conn.pid)
                    comm = proc.name()
                except Exception:
                    comm = "unknown"

                dest_ip = conn.raddr.ip
                dest_port = conn.raddr.port

                # Ignore standard local loopback traffic
                if dest_ip in ["127.0.0.1", "::1", "0.0.0.0"]:
                    continue

                event = {
                    "timestamp": current_time,
                    "event_type": "connect",
                    "pid": conn.pid,
                    "ppid": 0,
                    "uid": 1000,
                    "comm": comm,
                    "dest_ip": dest_ip,
                    "dest_port": dest_port,
                    "protocol": "TCP",
                    "metadata": {"os": "windows", "status": conn.status}
                }
                events.append(event)
    except Exception as e:
        logger.debug("Network poll exception: %v", e)

    return events

async def run_windows_agent():
    """Main continuous event loop streaming to the DEFENx backend over WebSocket."""
    global known_pids
    logger.info("Initializing DEFENx Windows Endpoint Sensor...")
    known_pids = set(psutil.pids())
    logger.info("Baseline process count: %d active PIDs", len(known_pids))

    while True:
        try:
            logger.info("Connecting to DEFENx Backend at %s...", WS_URL)
            async with websockets.connect(WS_URL) as ws:
                logger.info("Connected to DEFENx ingestion channel. Streaming live telemetry...")

                while True:
                    # 1. Poll process creations
                    proc_events = get_process_events()
                    for ev in proc_events:
                        await ws.send(json.dumps(ev))
                        logger.info("Streamed Process: [%s] PID=%d Path=%s", ev["comm"], ev["pid"], ev["path"])

                    # 2. Poll outbound network connections
                    net_events = get_network_events()
                    for ev in net_events[:5]:  # Batch send top active remote connections
                        await ws.send(json.dumps(ev))

                    await asyncio.sleep(1.0)

        except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError, OSError) as conn_err:
            logger.warning("Backend connection lost: %v. Reconnecting in 3 seconds...", conn_err)
            await asyncio.sleep(3.0)
        except Exception as e:
            logger.error("Unexpected error in agent loop: %v", e)
            await asyncio.sleep(3.0)

if __name__ == "__main__":
    try:
        asyncio.run(run_windows_agent())
    except KeyboardInterrupt:
        logger.info("DEFENx Windows Agent stopped by user.")

