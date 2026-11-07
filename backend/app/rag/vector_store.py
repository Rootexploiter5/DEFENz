import os
import logging
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.app.core.config import settings

logger = logging.getLogger("defenx.rag.vectorstore")

class LocalVectorStore:
    """Manages the on-device ChromaDB vector database for MITRE techniques, CVEs, and playbooks."""
    def __init__(self, persist_dir: str = settings.CHROMA_PERSIST_DIRECTORY):
        self.persist_dir = persist_dir
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="threat_intelligence",
            metadata={"description": "Local CVE, MITRE ATT&CK, and LotL Playbooks"}
        )
        logger.info("Local ChromaDB initialized at %s", self.persist_dir)

    def query_context(self, query_text: str, n_results: int = 2) -> str:
        """Queries local vector database for matching threat techniques or known vulnerable behaviors."""
        try:
            count = self.collection.count()
            if count == 0:
                return ""

            results = self.collection.query(
                query_texts=[query_text],
                n_results=min(n_results, count)
            )

            documents = results.get("documents", [[]])[0]
            if not documents:
                return ""

            return "\n---\n".join(documents)
        except Exception as e:
            logger.error("Error querying ChromaDB vector store: %v", e)
            return ""

    def add_intelligence_documents(self, documents: List[str], metadatas: List[Dict[str, Any]], ids: List[str]):
        """Adds intelligence records to the local vector collection."""
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        logger.info("Added %d threat intelligence documents to local vector store", len(documents))

vector_store = LocalVectorStore()

