import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.models.schemas import BaseTelemetryEvent
from backend.app.core.storage import insert_event
from backend.app.ml_filter.anomaly_scorer import scorer

logger = logging.getLogger("defenx.ws")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.frontend_clients: Set[WebSocket] = set()

    async def connect_frontend(self, websocket: WebSocket):
        await websocket.accept()
        self.frontend_clients.add(websocket)
        logger.info("Frontend client connected. Total clients: %d", len(self.frontend_clients))

    def disconnect_frontend(self, websocket: WebSocket):
        self.frontend_clients.discard(websocket)
        logger.info("Frontend client disconnected. Total clients: %d", len(self.frontend_clients))

    async def broadcast_frontend(self, message: dict):
        dead_clients = set()
        for client in self.frontend_clients:
            try:
                await client.send_json(message)
            except Exception:
                dead_clients.add(client)
        for client in dead_clients:
            self.frontend_clients.discard(client)

manager = ConnectionManager()

@router.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """
    Receives raw high-frequency telemetry events from the Go/eBPF agent.
    Performs ML scoring and persists events to the time-series store.
    """
    await websocket.accept()
    logger.info("Go eBPF Agent successfully connected to /ws/agent")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                raw_payload = json.loads(data)
                event = BaseTelemetryEvent(**raw_payload)
            except Exception as parse_err:
                logger.warning("Invalid event payload received: %v", parse_err)
                continue

            # 1. Asynchronously persist to SQLite time-series storage
            await insert_event(event)

            # 2. Evaluate with ML Filter (Isolation Forest)
            is_anomaly, anomaly_score = scorer.score_event(event)

            # 3. Stream live telemetry to frontend clients
            await manager.broadcast_frontend({
                "type": "TELEMETRY_EVENT",
                "data": event.dict(),
                "is_anomaly": is_anomaly,
                "anomaly_score": anomaly_score
            })

            # 4. Trigger AI Handoff if anomaly threshold breached
            if is_anomaly:
                from backend.app.api.routes import increment_anomaly_counter
                increment_anomaly_counter()

                logger.warning(
                    "Statistical anomaly detected! PID=%d Comm=%s Score=%.3f",
                    event.pid, event.comm, anomaly_score
                )
                await manager.broadcast_frontend({
                    "type": "ANOMALY_TRIGGERED",
                    "event": event.dict(),
                    "score": anomaly_score
                })

    except WebSocketDisconnect:
        logger.info("Go eBPF Agent disconnected from /ws/agent")
    except Exception as e:
        logger.error("Error in /ws/agent handler: %v", e)

@router.websocket("/ws/frontend")
async def websocket_frontend_endpoint(websocket: WebSocket):
    """
    Feeds real-time telemetry and AI alerts to the Next.js Command Center.
    """
    await manager.connect_frontend(websocket)
    try:
        while True:
            # Keep alive and receive user commands/queries
            msg = await websocket.receive_text()
            logger.debug("Received frontend client message: %s", msg)
    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)

