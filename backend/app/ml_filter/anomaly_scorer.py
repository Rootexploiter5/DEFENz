import os
import joblib
import logging
import numpy as np
import pandas as pd
from typing import Tuple, Optional
from backend.app.core.config import settings
from backend.app.models.schemas import BaseTelemetryEvent
from backend.app.ml_filter.baseline_trainer import extract_features

logger = logging.getLogger("defenx.ml.scorer")

class AnomalyScorer:
    def __init__(self, model_path: str = settings.MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info("Loaded baseline model from %s", self.model_path)
                return True
            except Exception as e:
                logger.error("Failed to load model from %s: %v", self.model_path, e)
                self.model = None
                return False
        logger.warning("No trained baseline model found at %s. Observation mode active.", self.model_path)
        return False

    def is_ready(self) -> bool:
        return self.model is not None

    def score_event(self, event: BaseTelemetryEvent) -> Tuple[bool, float]:
        """
        Evaluates an incoming event against the baseline model.
        Returns:
            (is_anomaly: bool, anomaly_score: float)
            where anomaly_score ranges from 0.0 (normal) to 1.0 (severe outlier).
        """
        if not self.model:
            # During observation mode or before training, mark as normal
            return False, 0.0

        # Create single-row DataFrame for feature extraction
        df = pd.DataFrame([{
            "event_type": event.event_type,
            "pid": event.pid,
            "ppid": event.ppid,
            "uid": event.uid,
            "comm": event.comm,
            "path": event.path,
            "dest_ip": event.dest_ip,
            "dest_port": event.dest_port
        }])

        X = extract_features(df)
        
        # decision_function yields negative values for outliers, positive for inliers
        raw_score = self.model.decision_function(X)[0]
        
        # Normalize score into [0, 1] range where 1.0 is most anomalous
        # Typical decision_function values range from -0.5 to 0.5
        normalized_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))

        # Check if the score breaches the 95th percentile threshold
        is_anomaly = normalized_score >= settings.ANOMALY_PERCENTILE_THRESHOLD
        
        return is_anomaly, normalized_score

# Singleton scorer instance
scorer = AnomalyScorer()

