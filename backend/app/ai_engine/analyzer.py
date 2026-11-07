import logging
import uuid
import os
import signal
from typing import Optional, Dict, Any
from backend.app.models.schemas import BaseTelemetryEvent, ThreatAlert, ProcessTree, ProcessNode
from backend.app.core.storage import get_recent_lineage
from backend.app.rag.vector_store import vector_store
from backend.app.ai_engine.ollama_client import ollama_client
from backend.app.ai_engine.prompt_templates import SYSTEM_FORENSIC_ANALYST_PROMPT, generate_forensic_prompt

logger = logging.getLogger("defenx.ai.analyzer")

def format_process_lineage_to_tree(events: list) -> tuple[str, ProcessTree, int]:
    """
    Transforms flat historical database rows into a structured process execution lineage string
    and Pydantic ProcessTree model.
    """
    if not events:
        return "No antecedent process history found.", ProcessTree(root_pid=0, nodes=[], tree_text="empty"), 0

    chain = []
    nodes = []
    root_pid = events[0].get("pid", 0)

    for ev in events:
        comm = ev.get("comm", "unknown")
        pid = ev.get("pid", 0)
        ppid = ev.get("ppid", 0)
        path = ev.get("path", "")
        ts = ev.get("timestamp", "")
        
        chain.append(f"{comm}(PID:{pid})")
        nodes.append(ProcessNode(
            pid=pid,
            ppid=ppid,
            comm=comm,
            path=path,
            timestamp=ts
        ))

    tree_text = " -> ".join(chain)
    tree_obj = ProcessTree(root_pid=root_pid, nodes=nodes, tree_text=tree_text)
    return tree_text, tree_obj, root_pid

def execute_remediation_action(action: str, pid: int):
    """
    Executes automated local endpoint response if recommended by LLM verdict.
    """
    if action == "KILL_PROCESS" and pid > 1:
        try:
            logger.warning("[Mitigation] Sending SIGKILL to anomalous PID %d", pid)
            os.kill(pid, signal.SIGKILL)
            logger.info("[Mitigation] Successfully terminated PID %d", pid)
        except ProcessLookupError:
            logger.info("[Mitigation] Process PID %d already exited", pid)
        except PermissionError:
            logger.error("[Mitigation] Insufficient privilege to terminate PID %d", pid)
        except Exception as e:
            logger.error("[Mitigation] Error terminating PID %d: %v", pid, e)

async def analyze_anomaly(event: BaseTelemetryEvent, anomaly_score: float) -> Optional[ThreatAlert]:
    """
    Orchestrates the AI Handoff:
    1. Queries local time-series DB for the last 5 minutes of telemetry around this PID.
    2. Builds the process tree representation.
    3. Retrieves local MITRE/CVE context from ChromaDB.
    4. Submits structured prompt to local Ollama with strict JSON format.
    5. Optionally executes automated response action.
    """
    logger.info("Executing Phase 3 AI Analysis for PID %d (%s)...", event.pid, event.comm)

    # 1. Fetch recent lineage for target PID and parent
    recent_events = await get_recent_lineage(event.pid, limit=30)
    tree_text, process_tree, root_pid = format_process_lineage_to_tree(recent_events)

    # 2. Local RAG lookup
    query_str = f"Process {event.comm} executing {event.path or ''} port {event.dest_port or ''}"
    rag_context = vector_store.query_context(query_str, n_results=2)

    # 3. Construct forensic prompt
    prompt = generate_forensic_prompt(event.dict(), tree_text, rag_context)

    # 4. Local LLM inference via Ollama
    verdict = ollama_client.query_forensics(prompt, SYSTEM_FORENSIC_ANALYST_PROMPT)

    if not verdict:
        logger.warning("Ollama unavailable or returned non-JSON verdict. Generating local fallback alert.")
        verdict = {
            "threat_level": "High" if anomaly_score > 0.98 else "Medium",
            "confidence": 0.85,
            "mitre_technique": "T1059 Command and Scripting Interpreter",
            "analysis": f"Statistical outlier detected in process {event.comm} exceeding 95th percentile threshold without LLM feedback.",
            "recommended_action": "MONITOR"
        }

    alert_id = str(uuid.uuid4())
    threat_level = verdict.get("threat_level", "Medium")
    recommended_action = verdict.get("recommended_action", "MONITOR")

    threat_alert = ThreatAlert(
        alert_id=alert_id,
        timestamp=event.timestamp,
        trigger_pid=event.pid,
        trigger_comm=event.comm,
        anomaly_score=anomaly_score,
        threat_level=threat_level,
        confidence=float(verdict.get("confidence", 0.9)),
        analysis=verdict.get("analysis", "Behavioral deviation identified."),
        recommended_action=recommended_action,
        process_tree=process_tree,
        dest_ip=event.dest_ip,
        dest_port=event.dest_port
    )

    # 5. Automated response action if High/Critical threat
    if threat_level in ["High", "Critical"] and recommended_action == "KILL_PROCESS":
        execute_remediation_action("KILL_PROCESS", event.pid)

    return threat_alert

