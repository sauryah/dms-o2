# Performance Optimizations (PERFORMANCE.md)

DMS-O2 enforces strict code execution budgets and optimization patterns to keep search latencies sub-50ms.

---

## 1. High-Speed Read Path Caching

### 1.1 Cache Keys Composition
Cache keys are constructed programmatically from all parsed query arguments:
`search:{q}:{die_type}:{status}:{location}:{casing}:{size_min}:{size_max}:{width_min}:{width_max}:{thick_min}:{thick_max}:{limit}:{offset}`

### 1.2 Redis Set-Tracker Invalidation
*   **Set Tracker**: Go adds cached search keys to the Redis Set `cached_searches` using `SAdd`.
*   **Atomic Invalidation**: On receiving a PostgreSQL notification, the cache deletes `stats` and retrieves tracked search keys via `SMembers` to delete them in a single batch. This avoids blocking cursor scans like `KEYS search:*`.

---

## 2. Connection Pooling Invariants

### 2.1 Django DB Pool
*   `CONN_MAX_AGE`: Persistent connections last 300 seconds (5 minutes).
*   `connect_timeout`: Max database connection wait time is 10 seconds.
*   `statement_timeout`: Queries are forced to timeout at 30 seconds (`options='-c statement_timeout=30000'`).

### 2.2 Go DB Pool
*   `MaxOpenConns`: 50
*   `MaxIdleConns`: 10
*   `ConnMaxLifetime`: 1 hour
*   `ConnMaxIdleTime`: 15 minutes

---

## 3. Database & Memory Optimizations

### 3.1 Pre-caching in Bulk Imports
*   Bulk imports pre-cache all Sets using `Set.objects.select_related('machine').all()` to eliminate N+1 database queries.
*   During imports, the system skips single-record sync signals by setting `_thread_locals.skip_single_sync = True`.

### 3.2 ORM Signal Optimization
*   Pre-save signals fetch old records using `.values(*fields)` instead of full model instantiations:
    ```python
    old_values = Die.objects.filter(pk=instance.pk).values(*DIE_WATCH_FIELDS).first()
    ```
    This reduces database query payload sizes and avoids trigger recursion loops.

### 3.3 Go Postgres array checks
*   Fetching Meilisearch document records from Postgres is combined into a single query using:
    ```sql
    WHERE d.id = ANY($1)
    ```
    Go executes this using the `pq.Array(hitIDs)` parameter, avoiding multiple database queries.

---

## 4. Frontend Render Virtualization
*   React lists with large datasets utilize `react-window` to limit the number of active DOM elements.
*   Grouping calculations for sets and machines are memoized on the client.
