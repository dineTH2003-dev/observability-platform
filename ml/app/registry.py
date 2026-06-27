from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import joblib

from app.config import settings


def save_artifact(model, entity_type: str, entity_id: int, metric_group: str) -> str:
    settings.artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_id = uuid4()
    path = settings.artifact_dir / entity_type / metric_group
    path.mkdir(parents=True, exist_ok=True)
    artifact_path = path / f"{entity_id}-{artifact_id}.joblib"
    joblib.dump(model, artifact_path)
    return str(artifact_path)


def load_artifact(artifact_uri: str):
    return joblib.load(Path(artifact_uri))


def register_model(
    conn,
    *,
    entity_type: str,
    entity_id: int,
    metric_group: str,
    algorithm: str,
    feature_schema: list[str],
    parameters: dict,
    thresholds: dict,
    artifact_uri: str,
    training_start,
    training_end,
    status: str,
    metrics: dict,
) -> str:
    row = conn.execute(
        """
        INSERT INTO ml_models
          (entity_type, entity_id, metric_group, algorithm, feature_schema, parameters,
           thresholds, artifact_uri, training_start, training_end, status, metrics)
        VALUES (%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s,%s,%s,%s,%s::jsonb)
        RETURNING model_id
        """,
        (
            entity_type,
            entity_id,
            metric_group,
            algorithm,
            json.dumps(feature_schema),
            json.dumps(parameters),
            json.dumps(thresholds),
            artifact_uri,
            training_start,
            training_end,
            status,
            json.dumps(metrics),
        ),
    ).fetchone()
    return str(row["model_id"])


def load_models(conn, *, entity_type: str, metric_group: str, statuses: tuple[str, ...] = ("active", "shadow")) -> dict[int, dict]:
    rows = conn.execute(
        """
        SELECT DISTINCT ON (entity_id)
          model_id, entity_id, feature_schema, thresholds, artifact_uri, status
        FROM ml_models
        WHERE entity_type = %s
          AND metric_group = %s
          AND status = ANY(%s)
          AND artifact_uri IS NOT NULL
        ORDER BY entity_id, created_at DESC
        """,
        (entity_type, metric_group, list(statuses)),
    ).fetchall()

    models = {}
    for row in rows:
        models[int(row["entity_id"])] = {
            "model_id": str(row["model_id"]),
            "status": row["status"],
            "feature_schema": row["feature_schema"],
            "thresholds": row["thresholds"],
            "model": load_artifact(row["artifact_uri"]),
        }
    return models
