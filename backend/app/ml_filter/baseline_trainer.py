import os
import sqlite3
import joblib
import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from backend.app.core.config import settings

logger = logging.getLogger("defenx.ml.trainer")

def extract_features(df: pd.DataFrame) -> np.ndarray:
    """
    Transforms raw telemetry records into vectorized behavioral features:
    1. Execve vs Connect event type flag (0 or 1)
    2. Path depth (number of directory separators)
    3. Path string length
    4. Destination port (0 for local execve)
    5. Is privileged port (< 1024)
    6. Is non-standard high port (> 10000)
    7. UID is root (0) flag
    """
    features = []
    for _, row in df.iterrows():
        is_connect = 1 if row["event_type"] == "connect" else 0
        path = str(row["path"] or "")
        path_depth = path.count("/")
        path_len = len(path)
        port = int(row["dest_port"] or 0)
        is_privileged_port = 1 if (0 < port < 1024) else 0
        is_high_port = 1 if (port > 10000) else 0
        is_root = 1 if int(row["uid"] or 0) == 0 else 0
        
        features.append([
            is_connect,
            path_depth,
            path_len,
            port,
            is_privileged_port,
            is_high_port,
            is_root
        ])
    return np.array(features, dtype=np.float32)

def train_baseline(db_path: str = settings.DATABASE_PATH, model_save_path: str = settings.MODEL_PATH):
    """
    Reads the collected observation-period telemetry from SQLite and trains
    an unsupervised Isolation Forest model to capture the device's normal baseline.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Observation database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query(
        "SELECT event_type, pid, ppid, uid, comm, path, dest_ip, dest_port FROM telemetry_events", 
        conn
    )
    conn.close()

    if len(df) < 50:
        raise ValueError(f"Insufficient baseline data for training: {len(df)} events found. Minimum 50 required.")

    logger.info("Training Isolation Forest on %d real device baseline events...", len(df))
    X = extract_features(df)

    # Contamination set to 0.01 representing expected low noise in normal baseline
    model = IsolationForest(
        n_estimators=100,
        contamination=0.01,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X)

    joblib.dump(model, model_save_path)
    logger.info("Baseline model successfully trained and saved to %s", model_save_path)
    return model
