from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "DEFENx Behavioral Anomaly Detection"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Storage
    DATABASE_PATH: str = "telemetry.db"
    
    # ML Filter Settings
    OBSERVATION_MODE: bool = False
    ANOMALY_PERCENTILE_THRESHOLD: float = 0.95
    MODEL_PATH: str = "baseline_isolation_forest.joblib"
    
    # AI Engine & Local LLM
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:8b"
    CHROMA_PERSIST_DIRECTORY: str = "chroma_db"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
