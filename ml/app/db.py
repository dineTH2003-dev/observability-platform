from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from app.config import settings


@contextmanager
def get_conn() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(settings.conninfo, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


def set_watermark(conn: psycopg.Connection, worker_name: str, processed_at) -> None:
    conn.execute(
        """
        INSERT INTO ml_watermarks (worker_name, last_processed_at, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (worker_name)
        DO UPDATE SET last_processed_at = EXCLUDED.last_processed_at, updated_at = NOW()
        """,
        (worker_name, processed_at),
    )


def get_watermark(conn: psycopg.Connection, worker_name: str):
    row = conn.execute(
        "SELECT last_processed_at FROM ml_watermarks WHERE worker_name = %s",
        (worker_name,),
    ).fetchone()
    return row["last_processed_at"] if row else None
