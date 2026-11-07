import json
import logging
import os
from typing import List
from backend.app.rag.vector_store import vector_store

logger = logging.getLogger("defenx.rag.ingest")

def ingest_cve_and_mitre_file(file_path: str):
    """
    Ingests local JSON file containing real CVE / MITRE ATT&CK definitions and response playbooks
    into the on-device ChromaDB vector store.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Intelligence data file not found at {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    documents: List[str] = []
    metadatas: List[dict] = []
    ids: List[str] = []

    for item in data:
        doc_id = item.get("id")
        title = item.get("title", "")
        description = item.get("description", "")
        severity = item.get("severity", "MEDIUM")
        mitre_tactic = item.get("mitre_tactic", "")
        remediation = item.get("remediation", "")

        doc_text = f"ID: {doc_id}\nTitle: {title}\nTactic: {mitre_tactic}\nSeverity: {severity}\nDescription: {description}\nRemediation: {remediation}"
        
        documents.append(doc_text)
        metadatas.append({
            "doc_id": doc_id,
            "title": title,
            "severity": severity,
            "mitre_tactic": mitre_tactic
        })
        ids.append(doc_id)

    vector_store.add_intelligence_documents(documents=documents, metadatas=metadatas, ids=ids)
    logger.info("Successfully ingested %d intelligence items from %s", len(ids), file_path)

