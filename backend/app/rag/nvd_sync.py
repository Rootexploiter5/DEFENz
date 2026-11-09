"""
NVD (National Vulnerability Database) & MITRE ATT&CK Ingestion Pipeline for DEFENx.
Retrieves real vulnerability definitions and indexes them into the on-device ChromaDB vector store.
"""

import os
import sys
import json
import logging
import requests
from typing import List, Dict, Any
from backend.app.rag.vector_store import vector_store

logging.basicConfig(level=logging.INFO, format="%(asctime)s [NVD-Ingest] %(message)s")
logger = logging.getLogger("defenx.rag.nvd")

NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

def fetch_recent_cves(keyword: str = "privilege escalation", results_per_page: int = 15) -> List[Dict[str, Any]]:
    """
    Fetches real, verified CVE records from the official NIST NVD API.
    """
    params = {
        "keywordSearch": keyword,
        "resultsPerPage": results_per_page
    }
    logger.info("Querying NIST NVD API for keyword: '%s'...", keyword)
    try:
        response = requests.get(NVD_API_URL, params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            cve_items = data.get("vulnerabilities", [])
            logger.info("Retrieved %d CVE items from NIST NVD.", len(cve_items))
            return cve_items
        else:
            logger.warning("NVD API returned HTTP %d: %s", response.status_code, response.text[:200])
    except Exception as e:
        logger.warning("Failed to connect to online NVD API (%v). Proceeding with local corpus.", e)
    return []

def index_cve_entries(cve_items: List[Dict[str, Any]]):
    """
    Transforms NVD JSON objects into document embeddings for the local vector store.
    """
    documents = []
    metadatas = []
    ids = []

    for item in cve_items:
        cve = item.get("cve", {})
        cve_id = cve.get("id")
        descriptions = cve.get("descriptions", [])
        desc_text = descriptions[0].get("value", "") if descriptions else ""

        # Extract CVSS severity
        metrics = cve.get("metrics", {})
        cvss_data = (
            metrics.get("cvssMetricV31", [{}])[0].get("cvssData", {}) or
            metrics.get("cvssMetricV30", [{}])[0].get("cvssData", {}) or
            metrics.get("cvssMetricV2", [{}])[0].get("cvssData", {})
        )
        base_score = cvss_data.get("baseScore", 5.0)
        severity = cvss_data.get("baseSeverity", "MEDIUM")

        doc_content = f"CVE: {cve_id}\nSeverity: {severity} (Score: {base_score})\nDescription: {desc_text}"

        documents.append(doc_content)
        metadatas.append({
            "doc_id": cve_id,
            "severity": severity,
            "score": float(base_score)
        })
        ids.append(cve_id)

    if documents:
        vector_store.add_intelligence_documents(documents=documents, metadatas=metadatas, ids=ids)
        logger.info("Successfully indexed %d CVEs into local ChromaDB threat store.", len(documents))

def run_nvd_sync():
    """Executes full NVD threat sync."""
    keywords = ["reverse shell", "privilege escalation", "command injection"]
    total = 0
    for kw in keywords:
        cves = fetch_recent_cves(keyword=kw, results_per_page=10)
        if cves:
            index_cve_entries(cves)
            total += len(cves)
    logger.info("NVD Sync complete. Total indexed: %d", total)

if __name__ == "__main__":
    run_nvd_sync()
