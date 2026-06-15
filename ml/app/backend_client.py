from __future__ import annotations

import requests

from app.config import settings


class BackendClient:
    def __init__(self, base_url: str | None = None, token: str | None = None) -> None:
        self.base_url = (base_url or settings.backend_api_url).rstrip("/")
        self.token = token if token is not None else settings.ml_internal_token

    def post_anomaly(self, payload: dict) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["x-ml-token"] = self.token

        response = requests.post(
            f"{self.base_url}/ml/anomalies",
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
