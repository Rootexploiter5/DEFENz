from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class BaseTelemetryEvent(BaseModel):
    timestamp: str
    event_type: str  # "execve" or "connect"
    pid: int
    ppid: Optional[int] = 0
    uid: int
    comm: str
    path: Optional[str] = None
    args: Optional[List[str]] = Field(default_factory=list)
    dest_ip: Optional[str] = None
    dest_port: Optional[int] = None
    protocol: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ProcessNode(BaseModel):
    pid: int
    ppid: int
    comm: str
    path: Optional[str] = None
    timestamp: str
    children: List["ProcessNode"] = Field(default_factory=list)

class ProcessTree(BaseModel):
    root_pid: int
    nodes: List[ProcessNode]
    tree_text: str  # Formatted hierarchical execution string (e.g. bash -> curl -> chmod)

class ThreatAlert(BaseModel):
    alert_id: str
    timestamp: str
    trigger_pid: int
    trigger_comm: str
    anomaly_score: float
    threat_level: str  # "Low", "Medium", "High", "Critical"
    confidence: float
    analysis: str
    recommended_action: str
    process_tree: ProcessTree
    dest_ip: Optional[str] = None
    dest_port: Optional[int] = None

class SystemHealth(BaseModel):
    status: str
    observation_mode: bool
    events_ingested: int
    anomalies_detected: int
    model_loaded: bool
