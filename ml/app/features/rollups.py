from __future__ import annotations


def backfill_server_rollups(conn, *, hours: int = 24) -> int:
    result = conn.execute(
        """
        WITH src AS (
          SELECT
            server_id,
            date_trunc('minute', recorded_at) AS window_start,
            date_trunc('minute', recorded_at) + INTERVAL '1 minute' AS window_end,
            COUNT(*)::int AS sample_count,
            GREATEST(0, 2 - COUNT(*))::int AS missing_count,
            MIN(cpu_usage) AS cpu_min,
            MAX(cpu_usage) AS cpu_max,
            AVG(cpu_usage) AS cpu_avg,
            (ARRAY_AGG(cpu_usage ORDER BY recorded_at DESC))[1] AS cpu_last,
            MIN(memory_usage) AS memory_min,
            MAX(memory_usage) AS memory_max,
            AVG(memory_usage) AS memory_avg,
            (ARRAY_AGG(memory_usage ORDER BY recorded_at DESC))[1] AS memory_last,
            MIN(disk_usage) AS disk_min,
            MAX(disk_usage) AS disk_max,
            AVG(disk_usage) AS disk_avg,
            (ARRAY_AGG(disk_usage ORDER BY recorded_at DESC))[1] AS disk_last,
            MIN(thread_count) AS thread_count_min,
            MAX(thread_count) AS thread_count_max,
            AVG(thread_count) AS thread_count_avg,
            (ARRAY_AGG(thread_count ORDER BY recorded_at DESC))[1] AS thread_count_last
          FROM server_metrics
          WHERE recorded_at >= NOW() - (%s || ' hours')::INTERVAL
          GROUP BY server_id, date_trunc('minute', recorded_at)
        )
        INSERT INTO server_metric_rollups_1m
          (server_id, window_start, window_end, sample_count, missing_count,
           cpu_min, cpu_max, cpu_avg, cpu_last,
           memory_min, memory_max, memory_avg, memory_last,
           disk_min, disk_max, disk_avg, disk_last,
           thread_count_min, thread_count_max, thread_count_avg, thread_count_last)
        SELECT
          server_id, window_start, window_end, sample_count, missing_count,
          cpu_min, cpu_max, cpu_avg, cpu_last,
          memory_min, memory_max, memory_avg, memory_last,
          disk_min, disk_max, disk_avg, disk_last,
          thread_count_min, thread_count_max, thread_count_avg, thread_count_last
        FROM src
        ON CONFLICT (server_id, window_start)
        DO UPDATE SET
          window_end = EXCLUDED.window_end,
          sample_count = EXCLUDED.sample_count,
          missing_count = EXCLUDED.missing_count,
          cpu_min = EXCLUDED.cpu_min,
          cpu_max = EXCLUDED.cpu_max,
          cpu_avg = EXCLUDED.cpu_avg,
          cpu_last = EXCLUDED.cpu_last,
          memory_min = EXCLUDED.memory_min,
          memory_max = EXCLUDED.memory_max,
          memory_avg = EXCLUDED.memory_avg,
          memory_last = EXCLUDED.memory_last,
          disk_min = EXCLUDED.disk_min,
          disk_max = EXCLUDED.disk_max,
          disk_avg = EXCLUDED.disk_avg,
          disk_last = EXCLUDED.disk_last,
          thread_count_min = EXCLUDED.thread_count_min,
          thread_count_max = EXCLUDED.thread_count_max,
          thread_count_avg = EXCLUDED.thread_count_avg,
          thread_count_last = EXCLUDED.thread_count_last
        """,
        (hours,),
    )
    return result.rowcount or 0


def backfill_service_rollups(conn, *, hours: int = 24) -> int:
    result = conn.execute(
        """
        WITH src AS (
          SELECT
            service_id,
            to_timestamp(floor(extract(epoch from recorded_at) / 300) * 300) AS window_start,
            to_timestamp(floor(extract(epoch from recorded_at) / 300) * 300) + INTERVAL '5 minutes' AS window_end,
            COUNT(*)::int AS sample_count,
            GREATEST(0, 3 - COUNT(*))::int AS missing_count,
            MIN(cpu_usage) AS cpu_min,
            MAX(cpu_usage) AS cpu_max,
            AVG(cpu_usage) AS cpu_avg,
            (ARRAY_AGG(cpu_usage ORDER BY recorded_at DESC))[1] AS cpu_last,
            MIN(memory_usage) AS memory_min,
            MAX(memory_usage) AS memory_max,
            AVG(memory_usage) AS memory_avg,
            (ARRAY_AGG(memory_usage ORDER BY recorded_at DESC))[1] AS memory_last
          FROM service_metrics
          WHERE recorded_at >= NOW() - (%s || ' hours')::INTERVAL
          GROUP BY service_id, to_timestamp(floor(extract(epoch from recorded_at) / 300) * 300)
        )
        INSERT INTO service_metric_rollups_5m
          (service_id, window_start, window_end, sample_count, missing_count,
           cpu_min, cpu_max, cpu_avg, cpu_last, memory_min, memory_max, memory_avg, memory_last)
        SELECT
          service_id, window_start, window_end, sample_count, missing_count,
          cpu_min, cpu_max, cpu_avg, cpu_last, memory_min, memory_max, memory_avg, memory_last
        FROM src
        ON CONFLICT (service_id, window_start)
        DO UPDATE SET
          window_end = EXCLUDED.window_end,
          sample_count = EXCLUDED.sample_count,
          missing_count = EXCLUDED.missing_count,
          cpu_min = EXCLUDED.cpu_min,
          cpu_max = EXCLUDED.cpu_max,
          cpu_avg = EXCLUDED.cpu_avg,
          cpu_last = EXCLUDED.cpu_last,
          memory_min = EXCLUDED.memory_min,
          memory_max = EXCLUDED.memory_max,
          memory_avg = EXCLUDED.memory_avg,
          memory_last = EXCLUDED.memory_last
        """,
        (hours,),
    )
    return result.rowcount or 0


def backfill_log_rollups(conn, *, hours: int = 24) -> int:
    result = conn.execute(
        """
        WITH src AS (
          SELECT
            service_id,
            to_timestamp(floor(extract(epoch from timestamp) / 300) * 300) AS window_start,
            to_timestamp(floor(extract(epoch from timestamp) / 300) * 300) + INTERVAL '5 minutes' AS window_end,
            COUNT(*)::int AS total_count,
            COUNT(*) FILTER (WHERE level = 'error')::int AS error_count,
            COUNT(*) FILTER (WHERE level = 'warn' OR level = 'warning')::int AS warning_count,
            COUNT(*) FILTER (WHERE level = 'info')::int AS info_count,
            COUNT(*) FILTER (WHERE level = 'debug')::int AS debug_count
          FROM log_entries
          WHERE timestamp >= NOW() - (%s || ' hours')::INTERVAL
          GROUP BY service_id, to_timestamp(floor(extract(epoch from timestamp) / 300) * 300)
        )
        INSERT INTO log_metric_rollups_5m
          (service_id, window_start, window_end, total_count, error_count, warning_count, info_count, debug_count)
        SELECT
          service_id, window_start, window_end, total_count, error_count, warning_count, info_count, debug_count
        FROM src
        ON CONFLICT (service_id, window_start)
        DO UPDATE SET
          window_end = EXCLUDED.window_end,
          total_count = EXCLUDED.total_count,
          error_count = EXCLUDED.error_count,
          warning_count = EXCLUDED.warning_count,
          info_count = EXCLUDED.info_count,
          debug_count = EXCLUDED.debug_count
        """,
        (hours,),
    )
    return result.rowcount or 0
