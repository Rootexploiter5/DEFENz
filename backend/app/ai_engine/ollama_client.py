import json
import logging
import requests
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger("defenx.ai.ollama")

class OllamaClient:
    """Client for querying the local Ollama instance with strict JSON schema enforcement."""
    def __init__(self, host: str = settings.OLLAMA_HOST, model: str = settings.OLLAMA_MODEL):
        self.host = host.rstrip("/")
        self.model = model
        self.generate_endpoint = f"{self.host}/api/generate"

    def is_available(self) -> bool:
        """Checks if local Ollama daemon is active and reachable."""
        try:
            resp = requests.get(f"{self.host}/api/tags", timeout=3)
            return resp.status_code == 200
        except Exception:
            return False

    def query_forensics(self, prompt: str, system_prompt: str) -> Optional[Dict[str, Any]]:
        """
        Submits prompt to local Ollama with format: 'json' parameter.
        Parses and returns structured verdict dictionary.
        """
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic security evaluation
                "top_p": 0.9
            }
        }

        try:
            logger.info("Dispatching forensic prompt to Ollama at %s using model %s", self.generate_endpoint, self.model)
            resp = requests.post(self.generate_endpoint, json=payload, timeout=60)
            resp.raise_for_status()

            data = resp.json()
            raw_response_text = data.get("response", "").strip()
            
            # Parse strict JSON returned by Ollama
            parsed_json = json.loads(raw_response_text)
            return parsed_json

        except requests.exceptions.RequestException as req_err:
            logger.error("Ollama HTTP connection failed: %v", req_err)
            return None
        except json.JSONDecodeError as json_err:
            logger.error("Failed to parse JSON response from Ollama: %v. Raw text: %s", json_err, raw_response_text)
            return None

# Singleton client instance
ollama_client = OllamaClient()
