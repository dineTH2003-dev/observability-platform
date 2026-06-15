from __future__ import annotations

import argparse

from app.db import get_conn
from app.features.rollups import backfill_server_rollups, backfill_service_rollups


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill metric rollup tables.")
    parser.add_argument("--hours", type=int, default=24)
    args = parser.parse_args()

    with get_conn() as conn:
        server_rows = backfill_server_rollups(conn, hours=args.hours)
        service_rows = backfill_service_rollups(conn, hours=args.hours)
        conn.commit()

    print(f"server_rollups_upserted={server_rows}")
    print(f"service_rollups_upserted={service_rows}")


if __name__ == "__main__":
    main()
