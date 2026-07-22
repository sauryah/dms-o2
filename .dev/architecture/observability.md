# DMS-O2 Observability & Monitoring Specification

This document details the observability architecture for the DMS-O2 platform, covering system metrics, distributed tracing, structured logging, database audits, and alerts.

---

## 📊 Prometheus Metrics Collection

Prometheus pulls metrics from the Go API, Gunicorn Django backend, Celery workers, and system processes.

### 1. Go Search API Metrics (Exported on `:8080/metrics`)
*   `go_search_requests_total{method, status}`: Counter of all search request cycles.
*   `go_search_duration_seconds{method}`: Summary/histogram of API response latencies.
*   `go_redis_conn_active`: Gauge of active Redis pool connections.
*   `go_redis_conn_starvation_total`: Counter of instances where a socket request waited for an idle connection.
*   `go_goroutines_active`: Gauge tracking Go runtime goroutine count.

### 2. Django & Gunicorn Metrics (Via `django-prometheus` on `:8000/metrics`)
*   `django_http_requests_total_by_view_transport_method{view, method}`: Request count per REST endpoint.
*   `django_http_responses_latency_seconds_by_view_method{view}`: Latency histogram for REST views.
*   `django_db_query_duration_seconds`: SQL execution time metrics.
*   `django_cache_hits_total{cache}` & `django_cache_misses_total{cache}`: Redis cache-hit ratios.

### 3. Celery & Redis Metrics (Via `celery-prometheus-exporter` / `redis_exporter`)
*   `celery_queue_length{queue}`: Pending task counts per queue backlog.
*   `celery_task_runtime_seconds{task}`: Execution durations for outbox processes and imports.
*   `redis_connected_clients`: Active Redis socket counts.
*   `redis_used_memory`: Redis memory footprint in bytes.

---

## 🖥️ Grafana Dashboards Structure

We maintain three primary dashboard templates inside Grafana:

1.  **DMS API & Cache Dashboard**:
    *   *Panels*: API Requests/Sec, Latency Histograms (p50/p95/p99), Cache Hit Ratios, Go Goroutine Count vs. Gunicorn Busy Threads.
2.  **PostgreSQL & DB Pool Dashboard**:
    *   *Panels*: Active connections count, transaction commit rates, index-hit ratio (target >99%), slow queries list (from `pg_stat_statements`).
3.  **Celery Worker & Queue Dashboard**:
    *   *Panels*: Task throughput/sec, task failure rates, queue backlog size, worker memory utilization.

---

## 🪵 Logging Strategy

DMS-O2 uses structured JSON logs formatted to stdout for easy ingestion by log forwarders (e.g., Vector, Fluentbit).

*   **Django Configuration**:
    JSON logging format is controlled in `backend/dms/settings.py` via `dms.logging.JsonFormatter`. Logs must output:
    ```json
    {
      "timestamp": "2026-07-19T15:27:39.011998+00:00",
      "level": "ERROR",
      "logger": "search.meili",
      "message": "Meilisearch connection/init failed: NameResolutionError",
      "module": "meili",
      "process": 38474,
      "thread": 139881492732864
    }
    ```
*   **Go Configuration**:
    Uses the native structured logger `log/slog`. High-frequency lookup events (e.g., Cache Hits) should use the `Debug` level, reserving `Info` for startup configuration and `Error` for connection/integrity failure traces.

---

## ⚡ Distributed Tracing Strategy

To track requests crossing from the React frontend through Traefik, the Go API, and the Django database, we use OpenTelemetry (OTel):

1.  **Trace propagation**: Inject `traceparent` headers matching the W3C Trace Context standard (`traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) at the React API layer.
2.  **Go Span boundaries**: Go API reads the context and wraps search calls in active spans. If Meilisearch is called, a child span is started.
3.  **Django Span boundaries**: When Go API makes internal API token verification calls to Django, the span context is preserved.

---

## 🚨 Sentry Configuration & Alert Rules

*   **Integration**: Integrated inside Django `settings.py` with custom transaction sampling rates (`traces_sample_rate = 0.1` in production, `1.0` in staging).
*   **Alerting Thresholds**:
    *   Trigger high-priority pager alerts on:
        *   Outbox HMACS signature verification failures (`OutboxTask payload integrity hash mismatch!`).
        *   Go API connection failures to Redis or Postgres.
        *   Database locks taking longer than **5.0 seconds** to resolve.
    *   Trigger Slack warnings on:
        *   Any API request returning HTTP 5xx.
        *   Search index synchronization failures.

---

## 🛢️ Slow Query Logging

Enable PostgreSQL Native logging for queries exceeding **100 ms**:

```sql
-- postgresql.conf parameters
log_min_duration_statement = 100
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

Periodic maintenance cron jobs run:
```sql
SELECT query, calls, total_exec_time/calls as avg_ms
FROM pg_stat_statements
ORDER BY avg_ms DESC
LIMIT 10;
```
This is reviewed weekly to detect missing indexes.
