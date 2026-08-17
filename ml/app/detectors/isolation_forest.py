from __future__ import annotations

import math

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

from app.config import settings
from app.detectors.types import Detection


def train_isolation_forest(frame, feature_columns: list[str]) -> tuple[Pipeline, dict]:
    x = frame[feature_columns].astype(float).fillna(0)
    model = Pipeline(
        steps=[
            ("scaler", RobustScaler()),
            (
                "isolation_forest",
                IsolationForest(
                    n_estimators=settings.isolation_estimators,
                    contamination=settings.isolation_contamination,
                    max_samples="auto",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(x)
    decision_scores = model.decision_function(x)
    anomaly_scores = np.maximum(0, -decision_scores)
    thresholds = {
        "score_threshold": float(np.quantile(anomaly_scores, 1 - settings.isolation_contamination)),
        "decision_threshold": 0.0,
    }
    return model, thresholds


def detect_with_isolation_model(row: dict, *, model_record: dict, feature_columns: list[str], entity_type: str) -> Detection | None:
    x = pd.DataFrame(
        [{col: _float_or_zero(row.get(col)) for col in feature_columns}],
        columns=feature_columns,
    )
    decision = float(model_record["model"].decision_function(x)[0])
    anomaly_score = max(0.0, -decision)
    threshold = float(model_record.get("thresholds", {}).get("score_threshold", 0.0))
    if decision >= 0 and anomaly_score <= threshold:
        return None

    if entity_type == "server":
        entity_id = int(row["server_id"])
        server_id = entity_id
        service_id = None
        application_id = None
        name = row.get("hostname") or f"server {entity_id}"
    else:
        entity_id = int(row["service_id"])
        server_id = _int_or_none(row.get("server_id"))
        service_id = entity_id
        application_id = _int_or_none(row.get("application_id"))
        name = row.get("service_name") or f"service {entity_id}"

    severity = "high" if anomaly_score >= max(threshold * 2, 0.1) else "medium"
    shadow = model_record.get("status") == "shadow"
    return Detection(
        entity_type=entity_type,
        entity_id=entity_id,
        server_id=server_id,
        service_id=service_id,
        application_id=application_id,
        anomaly_type="MULTIVARIATE",
        severity=severity,
        detector_name="isolation_forest",
        metric_value=anomaly_score,
        threshold=threshold,
        score=min(1.0, anomaly_score / max(threshold, 0.001)),
        confidence=0.8 if not shadow else 0.55,
        window_start=row["window_start"].isoformat(),
        window_end=row["window_end"].isoformat(),
        title=f"Unusual metric combination on {name}",
        description=(
            f"Isolation Forest marked the {entity_type} window as anomalous "
            f"(decision={decision:.6f}, score={anomaly_score:.6f}, threshold={threshold:.6f})."
        ),
        reason_codes=["multivariate_isolation_forest"],
        feature_values={col: _float_or_zero(row.get(col)) for col in feature_columns},
        model_id=model_record.get("model_id"),
        auto_create_incident=False if shadow else severity in ("high", "medium"),
    )


def _float_or_zero(value):
    if value is None:
        return 0.0
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if math.isnan(number) else number


def _int_or_none(value):
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(number) else int(number)
