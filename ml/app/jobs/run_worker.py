from __future__ import annotations

import argparse
import time
from datetime import datetime, timezone

from app.features.rollups import backfill_server_rollups, backfill_service_rollups, backfill_log_rollups
from app.jobs.score_realtime import score_once
from app.db import get_conn


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the ML anomaly scorer on a fixed interval.")
    parser.add_argument("--interval-seconds", type=int, default=60)
    parser.add_argument("--minutes", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--once", action="store_true", help="Run one iteration and exit.")
    parser.add_argument("--no-telemetry", action="store_true")
    parser.add_argument("--server-stale-minutes", type=int, default=10)
    parser.add_argument("--service-stale-minutes", type=int, default=15)
    parser.add_argument("--max-telemetry-entities", type=int, default=100)
    args = parser.parse_args()

    if args.interval_seconds < 10:
        raise SystemExit("--interval-seconds must be at least 10")

    while True:
        started = datetime.now(timezone.utc)
        try:
            with get_conn() as conn:
                backfill_server_rollups(conn, hours=24)
                backfill_service_rollups(conn, hours=24)
                backfill_log_rollups(conn, hours=24)
                conn.commit()

            result = score_once(
                minutes=args.minutes,
                dry_run=args.dry_run,
                include_telemetry=not args.no_telemetry,
                server_stale_minutes=args.server_stale_minutes,
                service_stale_minutes=args.service_stale_minutes,
                max_telemetry_entities=args.max_telemetry_entities,
                raise_post_errors=True,
            )
            print(
                "ml_worker_tick "
                f"started_at={started.isoformat()} "
                f"posted={result['posted']} "
                f"dry_run={result['dry_run']} "
                f"post_errors={result['post_errors']} "
                f"by_detector={dict(result['by_detector'])}"
            )
        except Exception as exc:
            print(f"ml_worker_error started_at={started.isoformat()} error={exc}")

        if args.once:
            break

        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        time.sleep(max(0, args.interval_seconds - elapsed))


if __name__ == "__main__":
    main()
