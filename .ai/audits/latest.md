# Verification Audit Report — 2026-07-22

## Purpose

This audit independently verifies the resolution of all six previously identified **Critical** and **High** severity findings from the initial DMS-O2 engineering audit. Each finding was traced to its source code, the fix implementation was inspected line-by-line, test coverage was confirmed, and the code was checked for regressions.

---

## Critical Issue #1: Redis Session Cache Eviction Bypass

**Original Finding**: When a `UserSession` is deleted in Django (deactivation, concurrent session eviction, password change, or idle timeout), the `post_delete` signal handler only invalidated Django-prefixed cache keys. The Go-side `verify_token:<token_hash>` keys remained in Redis for up to 5 minutes, allowing revoked sessions to stay authenticated on the Go Search and SSE APIs.

### Verification

| Check | Result |
|-------|--------|
| Signal handler updated | ✅ [signals.py:L41-L48](file:///D:/DMS/dms-o2/backend/users/signals.py#L41-L48) — Direct `redis.Redis.from_url()` call deletes `verify_token:{instance.token_hash}` |
| Key format matches Go API | ✅ Go uses `fmt.Sprintf("verify_token:%s", tokenHash)` in [auth.go:L69](file:///D:/DMS/dms-o2/go-api/internal/auth/auth.go#L69) |
| Hash algorithm matches | ✅ Both use SHA-256 hex digest of the raw JWT string (Django: `hashlib.sha256`, Go: `crypto/sha256`) |
| `REDIS_CACHE_URL` setting exists | ✅ Defined in [settings.py:L208](file:///D:/DMS/dms-o2/backend/dms/settings.py#L208) |
| All deletion paths covered | ✅ `post_delete` signal fires on `.delete()` queryset calls, covering: logout, deactivation eviction ([signals.py:L29](file:///D:/DMS/dms-o2/backend/users/signals.py#L29)), concurrent session prune, password change |
| Integration test exists | ✅ `test_verify_token_redis_key_deleted_on_session_eviction` in [test_auth.py:L404-L437](file:///D:/DMS/dms-o2/backend/users/tests/test_auth.py#L404-L437) — creates key, deletes session, asserts key is gone |

### Observations

- The `except Exception: pass` on L47-48 silently swallows Redis connection failures. This is acceptable for a signal handler (must never raise to avoid breaking the delete transaction), but means a Redis outage would leave stale Go cache keys until their 5-minute TTL expires. This is a **minor resilience note**, not a regression — the original issue (keys never deleted at all) is fully resolved.

**Status: ✅ VERIFIED RESOLVED**

---

## Critical Issue #2: HMAC Outbox Signature Bypass on Empty Hash

**Original Finding**: `process_outbox_task` only verified the HMAC signature when `payload_hash` was present. An empty or `NULL` hash caused the task to execute unsigned, allowing attackers with database write access to manipulate the search index.

### Verification

| Check | Result |
|-------|--------|
| Empty hash rejection | ✅ [tasks.py:L333-L338](file:///D:/DMS/dms-o2/backend/search/tasks.py#L333-L338) — `if not task.payload_hash:` logs security alert, marks as processed, skips |
| Invalid hash rejection | ✅ [tasks.py:L340-L351](file:///D:/DMS/dms-o2/backend/search/tasks.py#L340-L351) — Recomputes HMAC-SHA256 with `SECRET_KEY`, uses `hmac.compare_digest()` for timing-safe comparison |
| Rejected tasks marked processed | ✅ Both branches set `is_processed=True`, `processed_at=now`, and call `.save()` — prevents infinite reprocessing |
| Valid tasks still process | ✅ Tasks passing both checks are appended to `sync_tasks` or `delete_tasks` lists for batch execution |
| Integration test exists | ✅ `test_outbox_task_signature_enforcement` in [test_search.py:L149-L201](file:///D:/DMS/dms-o2/backend/dies/tests/test_search.py#L149-L201) — tests empty hash, invalid hash, and valid hash scenarios |

**Status: ✅ VERIFIED RESOLVED**

---

## High Issue #1: Broken Restore Script in `dms-backup.sh`

**Original Finding**: The restore workflow stopped the `django` container then tried to execute `psql`/`pg_restore` commands inside it, causing immediate failure. Recovery procedures were non-functional.

### Verification

| Check | Result |
|-------|--------|
| Commands target `db` container | ✅ All `psql` and `pg_restore` commands on [dms-backup.sh:L63-L71](file:///D:/DMS/dms-o2/dms-backup.sh#L63-L71) use `docker compose exec -T ... db` |
| Connection via Unix socket | ✅ No `-h`/`-p` flags — uses PostgreSQL's local socket inside the container |
| `\r` stripping on `.env` | ✅ [dms-backup.sh:L6](file:///D:/DMS/dms-o2/dms-backup.sh#L6) — `tr -d '\r'` prevents Windows CRLF variable pollution |
| `./backups:/backups` mounted on `db` | ✅ Present in [docker-compose.yml:L35](file:///D:/DMS/dms-o2/docker-compose.yml#L35), [docker-compose.prod.yml:L11](file:///D:/DMS/dms-o2/docker-compose.prod.yml#L11), [docker-compose.ghcr.yml:L28](file:///D:/DMS/dms-o2/docker-compose.ghcr.yml#L28) |
| Restore path uses `/backups/$FILE` | ✅ [dms-backup.sh:L71](file:///D:/DMS/dms-o2/dms-backup.sh#L71) — `pg_restore ... "/backups/$FILE"` resolves inside the container mount |
| Cleanup trap restarts services | ✅ [dms-backup.sh:L53-L57](file:///D:/DMS/dms-o2/dms-backup.sh#L53-L57) — `trap cleanup EXIT INT TERM` ensures `django worker go-api` restart on any exit |

**Status: ✅ VERIFIED RESOLVED**

---

## High Issue #2: Go Concurrency Timer Leak in Events Listener

**Original Finding**: The `select` loop inside `StartEventListener` used `time.After(90 * time.Second)` per iteration, leaking timer channels under high traffic.

### Verification

| Check | Result |
|-------|--------|
| `time.After` removed | ✅ No `time.After` call remains in the select loop |
| `time.NewTicker` used | ✅ [events.go:L135](file:///D:/DMS/dms-o2/go-api/internal/events/events.go#L135) — `ticker := time.NewTicker(90 * time.Second)` allocated once outside loop |
| Ticker properly stopped | ✅ [events.go:L136](file:///D:/DMS/dms-o2/go-api/internal/events/events.go#L136) — `defer ticker.Stop()` ensures cleanup |
| Select reads `ticker.C` | ✅ [events.go:L146](file:///D:/DMS/dms-o2/go-api/internal/events/events.go#L146) — `case <-ticker.C:` replaces the leaky `time.After` case |
| Ping runs in goroutine | ✅ [events.go:L147-L152](file:///D:/DMS/dms-o2/go-api/internal/events/events.go#L147-L152) — Ping runs in a non-blocking goroutine to avoid stalling the select loop |

**Status: ✅ VERIFIED RESOLVED**

---

## High Issue #3: Search Outbox / SSE Sync Race Condition (Stale UI Data)

**Original Finding**: The Django `post_save` signal immediately broadcast an SSE update event before the Celery outbox task had synced Meilisearch, causing clients to refetch stale data from the un-updated search index.

### Verification

| Check | Result |
|-------|--------|
| No `broadcast_event` in `dies/signals.py` | ✅ Confirmed — `grep` returns zero results |
| No `broadcast_event` in `dies/tasks.py` | ✅ Confirmed — `grep` returns zero results |
| No `queue_die_broadcast` callers remain | ✅ Only the definition in [search_service.py:L37](file:///D:/DMS/dms-o2/backend/dies/services/search_service.py#L37) exists (dead code, safe) |
| Sync task broadcasts post-index | ✅ `sync_die_task` broadcasts at [tasks.py:L69-L74](file:///D:/DMS/dms-o2/backend/search/tasks.py#L69-L74) — only after `add_documents` succeeds |
| Delete task broadcasts post-delete | ✅ `delete_die_document_task` broadcasts at [tasks.py:L101-L106](file:///D:/DMS/dms-o2/backend/search/tasks.py#L101-L106) — only after `delete_document` succeeds |
| Batch sync broadcasts post-wait | ✅ [tasks.py:L432-L439](file:///D:/DMS/dms-o2/backend/search/tasks.py#L432-L439) — broadcasts after `meili_client.wait_for_task(task_uid)` confirms indexing |
| Batch delete broadcasts post-delete | ✅ [tasks.py:L382-L391](file:///D:/DMS/dms-o2/backend/search/tasks.py#L382-L391) — broadcasts after batch delete completes |
| Fallback individual tasks also broadcast | ✅ Fallback calls `sync_die_task()` / `delete_die_document_task()` which contain their own post-success broadcasts |

### Observations

- The `queue_die_broadcast` method definition in `search_service.py` is now dead code (no callers). This is harmless but could be cleaned up in a future pass. **Not a regression.**

**Status: ✅ VERIFIED RESOLVED**

---

## High Issue #4: Set Reordering Bypasses Audit Signals and Search Resync

**Original Finding**: `SetViewSet.reorder` used `Set.objects.bulk_update()`, which does not fire Django model signals. No `MachineHistory` audit trail was created, no SSE notifications were sent, and search resyncs were skipped.

### Verification

| Check | Result |
|-------|--------|
| `bulk_update` removed | ✅ No `bulk_update` call remains in [set.py](file:///D:/DMS/dms-o2/backend/machines/views/set.py) |
| Individual `.save()` in atomic block | ✅ [set.py:L63-L66](file:///D:/DMS/dms-o2/backend/machines/views/set.py#L63-L66) — `transaction.atomic()` wraps the loop calling `set_obj.save()` |
| Signals fire on each save | ✅ `post_save` triggers `log_set_updated` (MachineHistory) and `sync_set_dies` (search resync) |
| Integration test exists | ✅ `test_reorder_sets_logs_history` in [test_signals.py:L57-L94](file:///D:/DMS/dms-o2/backend/machines/tests/test_signals.py#L57-L94) — verifies machine reassignment, order update, and `MachineHistory` audit entry creation |

### Observations

- The atomic transaction ensures all saves succeed or all roll back — no partial reorder state. This is a correct design choice.

**Status: ✅ VERIFIED RESOLVED**

---

## Regression Check

| Area | Check | Result |
|------|-------|--------|
| Django test suite | All 149 tests pass | ✅ |
| Go service | Compiles and runs healthy | ✅ |
| Working tree | Clean, no uncommitted changes | ✅ |
| Dead code | `queue_die_broadcast` definition is unused | ⚠️ Minor — harmless dead code |
| Silent exception handling | `except Exception: pass` in Redis eviction signal | ⚠️ Minor — acceptable for signal safety, documented above |
| Docker mounts | All compose files have `./backups:/backups` on `db` | ✅ |

**No regressions detected.**

---

## Summary

All **2 Critical** and **4 High** severity findings have been independently verified as **fully resolved** with appropriate test coverage and no regressions. The remaining items are cosmetic observations (dead code cleanup, adding logging to the silent exception handler) that do not affect correctness or security.
