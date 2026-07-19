# DMS-O2 — AI Coding Agent Operating Manual (AGENT.md)

This document is the permanent operating manual for all autonomous AI coding agents (Claude Code, Antigravity CLI, Codex CLI, Gemini CLI, Cursor, Windsurf, etc.) working on the DMS-O2 codebase.

It defines behavioral invariants, task workflows, and memory-sync policies. For project structure, architecture, coding conventions, database models, or history, refer directly to the context files in the `.ai/` directory.

---

## 1. Persistent AI Memory Workflow

This repository uses a repository-backed memory strategy to ensure coding consistency and prevent context drift.

1.  **Discovery (Before starting any task)**: AI coding agents must read the relevant context documents inside the `.ai/` directory (e.g., [MASTER_CONTEXT.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/MASTER_CONTEXT.md), [ARCHITECTURE.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/ARCHITECTURE.md), [CONVENTIONS.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/CONVENTIONS.md), etc.) to align with schema definitions, state machines, and coding patterns.
2.  **Sync (After completing any task)**: AI coding agents must update any documents in the `.ai/` directory whose information has changed as a result of the task execution (e.g., adding API routes to `API_MAP.md`, dependencies to `DEPENDENCIES.md`, or coding standards to `CONVENTIONS.md`).
3.  **Rationale**: This ensures the AI agent maintains a persistent, repository-backed context memory instead of relying solely on transient LLM conversation history.

---

## 2. Definition of Done (DoD)

A modification is complete when:
1.  **Lints & Checks**: Pre-commit checks complete successfully without warning flags.
2.  **Migrations**: Database migration files are compiled, checked via `makemigrations --check --dry-run`, and executed cleanly.
3.  **Test Suites**: Unit and E2E specs pass (`manage.py test`, `go test`, `npm test`, `playwright test` - see [CONVENTIONS.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/CONVENTIONS.md) for details).
4.  **Documentation**: The project changelog in `PROJECT.md` is updated with specific versions and details.
5.  **Clean Code**: No residual `print()` or `console.log()` statements remain.
6.  **AI Memory**: Any documentation inside `.ai/` affected by the task has been updated to prevent drift.

---

## 3. Code Review Checklist

Before finalizing task branches, coding agents must verify:
*   [ ] Did I perform a dry-run migration check (`makemigrations --check --dry-run`)?
*   [ ] Are signal triggers optimized via `.values()` database fetches?
*   [ ] Does the Go search API sanitize filter inputs using `escapeMeiliFilterValue`?
*   [ ] Does the frontend hook inject `X-Requested-With: XMLHttpRequest` for state-changing cookie calls?
*   [ ] Do search index updates use the outbox database queue?
*   [ ] Did I record the changes in `PROJECT.md` section 8?
*   [ ] Did I review and update the relevant context documents in `.ai/`?

---

## 4. Mandatory Engineering Standards

Coding agents must conform to the following engineering standards during development:

### Rule 1: Thread-Local Transaction-Deduplicated Search Indexing
*   **Explanation**: Modifying a Die must queue sync and broadcast tasks using the thread-local sets `_thread_locals.pending_sync_die_ids` and `_thread_locals.pending_broadcast_keys` to deduplicate them.
*   **Rationale**: Prevents duplicate Celery tasks and database locks when a single request modifies a Die multiple times.
*   **Enforcement**: Inside the Django transaction commit listeners.
*   **Source Files**: [search_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/search_service.py) and [middleware.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/middleware.py).
*   **Impact of Violation**: Causes database transaction locks, outbox bloat, and slows down Meilisearch indexing.
*   **Engineering Invariant**: All Die modifications must delegate to `SearchService.queue_die_sync(die_id)`.
*   **Examples**:
    *   *Correct*:
        ```python
        from dies.services.search_service import SearchService
        SearchService.queue_die_sync(die.id)
        ```
    *   *Incorrect*:
        ```python
        # Bypassing deduplication and transaction commits
        from search.tasks import process_outbox_task
        process_outbox_task.delay()
        ```

### Rule 2: Double-Buffered Search Read-Path Proxying
*   **Explanation**: The Go Search API must handle all text/fuzzy searches using Meilisearch IDs, query PostgreSQL using `WHERE d.id = ANY($1)`, and fall back to database queries only when Meilisearch is down.
*   **Rationale**: Offloads expensive text scans from PostgreSQL to keep response latencies sub-50ms under load.
*   **Enforcement**: Go search controllers.
*   **Source Files**: [handlers.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/handlers/handlers.go) and [cache.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/cache/cache.go).
*   **Impact of Violation**: Causes high database CPU usage and slow query responses.
*   **Engineering Invariant**: Fuzzy search queries must be sent to the Go Search API, not Django.
*   **Examples**:
    *   *Correct (Go)*:
        ```go
        res, err := meiliClient.Index("dies").Search(query, &meilisearch.SearchRequest{})
        db.Select(&dies, "SELECT * FROM dies WHERE id = ANY($1)", pq.Array(hitIDs))
        ```
    *   *Incorrect (Django)*:
        ```python
        # Performing heavy text matching directly in Postgres
        Dies.objects.filter(remarks__icontains=query)
        ```

### Rule 3: Restorer Session Preservation during Database Restore
*   **Explanation**: Wiping session tables during a database restore logs out the administrator performing the restore, causing the task to fail. The restore workflow must capture, preserve, and restore this session.
*   **Rationale**: Prevents session termination mid-process.
*   **Enforcement**: Inside the database restore service.
*   **Source Files**: [backup.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/views/backup.py) and [backup_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/services/backup_service.py).
*   **Impact of Violation**: Wipes active database connection states and interrupts the restore process.
*   **Engineering Invariant**: Session preservation variables must be passed to `BackupService.restore_backup()`.
*   **Examples**:
    *   *Correct*:
        ```python
        session_data = {'user_id': request.user.id, 'token_hash': token_hash}
        restore_backup_task.delay(filepath, filename, request.user.id, session_data)
        ```
    *   *Incorrect*:
        ```python
        # Wipes all sessions without preserving the restorer's session
        BackupService.restore_backup(filepath, filename, None, None)
        ```

### Rule 4: CSRF XMLHttpRequest Validation
*   **Explanation**: State-changing requests (POST, PATCH, DELETE) that use cookies must provide the custom header `X-Requested-With: XMLHttpRequest`.
*   **Rationale**: Prevents Cross-Site Request Forgery (CSRF) on JWT token cookies.
*   **Enforcement**: Django CSRF middleware.
*   **Source Files**: [useApi.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/hooks/useApi.ts) and [middleware.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/middleware.py).
*   **Impact of Violation**: State-changing requests are rejected with a `403 Forbidden` error.
*   **Engineering Invariant**: Custom fetch hooks must attach the `X-Requested-With` header to mutating calls.
*   **Examples**:
    *   *Correct*:
        ```typescript
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        ```
    *   *Incorrect*:
        ```typescript
        const res = await fetch(url, { method: 'PATCH' });
        ```

### Rule 5: Timing-Safe Internal Verification Key
*   **Explanation**: Verify token middleware checks between services must validate keys using timing-safe comparisons.
*   **Rationale**: Prevents timing attacks that try to guess the secret key character-by-character.
*   **Enforcement**: Django verify-token middleware.
*   **Source Files**: [middleware.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/middleware.py) and [auth.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/auth/auth.go).
*   **Impact of Violation**: Exposes the internal secret key to character-guessing timing attacks.
*   **Engineering Invariant**: Never compare secrets or tokens using the standard `==` operator.
*   **Examples**:
    *   *Correct*:
        ```python
        if not hmac.compare_digest(internal_key, settings.INTERNAL_API_SECRET):
            raise PermissionDenied()
        ```
    *   *Incorrect*:
        ```python
        if internal_key != settings.INTERNAL_API_SECRET:
            raise PermissionDenied()
        ```

### Rule 6: Brute-Force Rate Limiting & Lockout Throttling
*   **Explanation**: User logins must be rate-limited per IP, and consecutive failures must trigger Redis-backed lockouts.
*   **Rationale**: Protects user credentials against brute-force stuffing attacks.
*   **Enforcement**: `LoginRateThrottle` and Redis cache keys.
*   **Source Files**: [auth.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/views/auth.py).
*   **Impact of Violation**: Increases the risk of unauthorized account access via credential brute-forcing.
*   **Engineering Invariant**: Authentication handlers must use `LoginRateThrottle` and check failed attempts against Redis before validating credentials.

### Rule 7: Cascading Set/Machine Metadata Syncing Signals
*   **Explanation**: Modifying a Set or Machine must queue sync tasks for all child dies on transaction commit.
*   **Rationale**: Keeps search indexes in sync when parent machine or set attributes change.
*   **Enforcement**: Django signals on `Set` and `Machine`.
*   **Source Files**: [signals.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/machines/signals.py).
*   **Impact of Violation**: Meilisearch search results will display stale set or machine names.
*   **Engineering Invariant**: When editing sets or machines, trigger `sync_dies_batch_task` for child dies on transaction commit.
*   **Examples**:
    *   *Correct*:
        ```python
        @receiver(post_save, sender=Set)
        def sync_set_dies(sender, instance, **kwargs):
            transaction.on_commit(lambda: sync_dies_batch_task.delay(die_ids))
        ```

### Rule 8: Secure Path-Traversal Filename Validations
*   **Explanation**: Resolving file paths using user-supplied names must use `os.path.commonpath` checks.
*   **Rationale**: Prevents directory traversal attacks that try to access host files outside the backup directory.
*   **Enforcement**: `BackupService.validate_filepath()`.
*   **Source Files**: [backup_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/services/backup_service.py).
*   **Impact of Violation**: Allows unauthorized reading or writing of sensitive host files (e.g., `/etc/passwd`).
*   **Engineering Invariant**: Validate file paths using common directory paths before reading or writing files.

### Rule 9: User Role Mutation Security Guard
*   **Explanation**: Role modifications and tool authorizations are restricted to `ROOT` users, and `ROOT` users cannot demote or deactivate themselves.
*   **Rationale**: Protects access controls and prevents administrative lockouts.
*   **Enforcement**: `UserSerializer.validate()`.
*   **Source Files**: [profile.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/serializers/profile.py).
*   **Impact of Violation**: Increases the risk of administrative lockouts or unauthorized role changes.
*   **Engineering Invariant**: User mutation serializers must block self-demotion and role edits by non-ROOT accounts.

### Rule 10: Import Sizing Dry-Run Rollbacks
*   **Explanation**: Spreadsheet import views/tasks must support a `dry_run=True` param that executes parser checks inside a transaction savepoint and then calls `transaction.set_rollback(True)`.
*   **Rationale**: Validates imports without altering database states or polluting live tables.
*   **Enforcement**: Row processing loop inside import service.
*   **Source Files**: [import_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/import_service.py).
*   **Impact of Violation**: Commits untested, faulty bulk data directly to production tables.
*   **Engineering Invariant**: Wrap row loops in `transaction.atomic()` and set rollback to `True` if `dry_run` is requested.
*   **Examples**:
    *   *Correct*:
        ```python
        with transaction.atomic():
            ImportService._process_row(row_data)
            if dry_run:
                transaction.set_rollback(True)
        ```

### Rule 11: Spreadsheet Case-Insensitive Header Mapping
*   **Explanation**: Parsed spreadsheet headers must be lowercased and stripped, and mapping aliases must support both `punched_` and `original_` prefix names.
*   **Rationale**: Prevents character casing or naming mismatches from rejecting valid user uploads.
*   **Enforcement**: File parser methods.
*   **Source Files**: [import_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/import_service.py).
*   **Impact of Violation**: Blocks spreadsheets containing valid headers written in alternate cases (e.g. UPPERCASE).
*   **Engineering Invariant**: Normalize headers via `.strip().lower()` and resolve column keys using aliases.

### Rule 12: Linear Wear Prediction & Alert Extrapolation
*   **Explanation**: Sizing wear rates must calculate days elapsed between first and last history measurements, requiring `days_elapsed > 0.01` to prevent division-by-zero errors.
*   **Rationale**: Ensures wear-rate extrapolations are mathematically sound and do not crash on back-to-back updates.
*   **Enforcement**: Sizing wear calculation service.
*   **Source Files**: [wear_prediction_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/wear_prediction_service.py).
*   **Impact of Violation**: Division-by-zero crashes on fast updates, or incorrect alerts reporting false timeframes.
*   **Engineering Invariant**: Assert `days_elapsed > 0.01` before calculating divisions by days elapsed.
*   **Examples**:
    *   *Correct*:
        ```python
        days_elapsed = (t_last - t0).total_seconds() / 86400.0
        if days_elapsed > 0.01:
            wear_rate = abs(v_last - v0) / days_elapsed
        ```

### Rule 13: Non-Root Container Execution and Port Mapping
*   **Explanation**: Production and development Dockerfiles must execute under a dedicated non-root user (e.g. `dmsuser`). Processes inside containers must bind only to non-privileged ports (>=1024, such as 8080 or 8000).
*   **Rationale**: Prevents host system compromise and privilege escalations in case of container escapes.
*   **Enforcement**: Dockerfile directives, docker-compose mappings, and Supervisord configurations.
*   **Source Files**: [Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/Dockerfile), [backend/Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/backend/Dockerfile), and [go-api/Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/go-api/Dockerfile).
*   **Impact of Violation**: Compromising any single process inside the container would grant the attacker root privileges on the container's file system.
*   **Engineering Invariant**: Always declare `USER dmsuser` at the end of the Dockerfile build process and bind server processes to ports >= 1024 inside the container.

---

## 5. Local Task Workflows

### 5.1 Environment Bootstrap
To stand up local containers, compile certificates, and seed data, execute standard Makefile shortcuts:
```bash
make setup         # Automated mkcert LAN TLS and docker build bootstrapper
make start         # Up all containers in background
make migrate       # Applies DB migrations
make seed          # Seeds standard root credentials
```

### 5.2 Operations Tools
*   Database Backups: `make backup` (executes `/scripts/backup_db.sh` container-side).
*   Rebuild Search Index: `make sync-search` (runs `sync_search` management task).
*   Restore Backup: `make restore FILE=<dump_filename>` (runs `pg_restore` commands).
*   Compile Changelogs: Running Python script `scripts/update_project_md.py` will sync current git commits to `PROJECT.md` changelog automatically.

---

## 6. Forbidden Behaviors

1.  **Writing Dummy Tests**: Never use blank or generic assertions.
2.  **Hardcoding Variables**: Do not commit secrets. Use environment variables defined in `.env.example`.
3.  **Bypassing Outbox Pattern**: Do not write direct Meilisearch document upload queries outside the outbox queues.
4.  **Bypassing CSRF Checks**: Do not remove `X-Requested-With` headers from state-changing React calls.
5.  **Bypassing Migrations**: Bypassing Django migrations to modify PostgreSQL tables directly is forbidden.
6.  **Mutating DieHistory**: Do not insert or update `DieHistory` entries manually.

---

## 7. System Parameters & UNKNOWN Values

The following attributes are context-specific or environment-dependent, and cannot be inferred from the codebase. Agents must treat these as **UNKNOWN** parameters rather than inventing values:

*   **Production Host Details**: The exact IP address, domain names, or target URLs of the production host server are **UNKNOWN** (stored as secrets like `SERVER_HOST`).
*   **SSH credentials**: The SSH key used for automated deploy access is **UNKNOWN** (`SERVER_SSH_KEY`).
*   **LAN Network domains**: The specific local machine domain config or LAN URLs outside the mkcert localhost setup are **UNKNOWN**.
*   **Backup Storage locations**: The exact cloud endpoints or secondary storage directories target for manual DB snapshots outside `/backups` are **UNKNOWN**.
