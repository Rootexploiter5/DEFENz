import aiosqlite
import logging
from typing import List, Optional
from backend.app.core.config import settings
from backend.app.models.schemas import BaseTelemetryEvent

logger = logging.getLogger("defenx.storage")

CREATE_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    pid INTEGER NOT NULL,
    ppid INTEGER NOT NULL,
    uid INTEGER NOT NULL,
    comm TEXT NOT NULL,
    path TEXT,
    dest_ip TEXT,
    dest_port INTEGER,
    protocol TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telemetry_pid ON telemetry_events(pid);
CREATE INDEX IF NOT EXISTS idx_telemetry_ppid ON telemetry_events(ppid);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp);
"""

async def init_db():
    """Initializes the SQLite time-series telemetry table and indexes."""
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        await db.executescript(CREATE_EVENTS_TABLE)
        await db.commit()
    logger.info("Telemetry database initialized at %s", settings.DATABASE_PATH)

async def insert_event(event: BaseTelemetryEvent):
    """Inserts an incoming kernel event into persistent time-series storage."""
    query = """
    INSERT INTO telemetry_events (
        timestamp, event_type, pid, ppid, uid, comm, path, dest_ip, dest_port, protocol
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        await db.execute(query, (
            event.timestamp,
            event.event_type,
            event.pid,
            event.ppid or 0,
            event.uid,
            event.comm,
            event.path or "",
            event.dest_ip or "",
            event.dest_port or 0,
            event.protocol or ""
        ))
        await db.commit()

async def get_recent_lineage(pid: int, limit: int = 50) -> List[dict]:
    """Queries telemetry for the target PID and its ancestors/children within recent history."""
    query = """
    SELECT timestamp, event_type, pid, ppid, uid, comm, path, dest_ip, dest_port
    FROM telemetry_events
    WHERE pid = ? OR ppid = ?
    ORDER BY id DESC
    LIMIT ?
    """
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, (pid, pid, limit)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in reversed(rows)]

