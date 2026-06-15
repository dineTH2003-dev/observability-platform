from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "observability_db")
    backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:9000/api").rstrip("/")
    ml_internal_token: str | None = os.getenv("ML_INTERNAL_TOKEN")
    artifact_dir: Path = Path(
        os.getenv("ML_ARTIFACT_DIR", str(Path(__file__).resolve().parents[1] / "artifacts"))
    )
    isolation_contamination: float = float(os.getenv("ML_ISOLATION_CONTAMINATION", "0.01"))
    isolation_estimators: int = int(os.getenv("ML_ISOLATION_ESTIMATORS", "200"))
    min_training_rows: int = int(os.getenv("ML_MIN_TRAINING_ROWS", "500"))

    @property
    def conninfo(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_user} password={self.db_password}"
        )


settings = Settings()
