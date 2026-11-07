import os
from fastapi import APIRouter, HTTPException
from backend.app.core.config import settings
from backend.app.models.schemas import SystemHealth
from backend.app.core.storage import get_recent_lineage
from backend.app.ml_filter.anomaly_scorer import scorer
from backend.app.ml_filter.baseline_trainer import train_baseline

router = APIRouter()

@router.get("/health", response_model=SystemHealth)
async def get_system_health():
    """Returns the operational status of the EDR backend and ML model."""
    return SystemHealth(
        status="ACTIVE",
        observation_mode=settings.OBSERVATION_MODE,
        events_ingested=0,
        anomalies_detected=0,
        model_loaded=scorer.is_ready()
    )

@router.post("/ml/train-baseline")
async def trigger_baseline_training():
    """Triggers training of the Isolation Forest model using the collected baseline events."""
    try:
        train_baseline()
        scorer.load_model()
        return {"status": "SUCCESS", "message": "Baseline model trained successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/telemetry/lineage/{pid}")
async def get_process_lineage(pid: int):
    """Retrieves process parent/child execution lineage for the specified PID."""
    lineage = await get_recent_lineage(pid)
    return {"pid": pid, "events": lineage}

