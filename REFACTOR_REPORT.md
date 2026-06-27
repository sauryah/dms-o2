# Production Refactoring Report

**Date:** June 2026
**Scope:** Backend `dies` and `users` applications

## Priority Ranking
* **High:** Architecture, Security
* **Medium:** Maintainability, Code Smells
* **Low:** Performance, Testing Gaps

## 1. Architecture Issues
* **God Objects & Tight Coupling:** The `import_dies` method in `backend/dies/services/import_service.py` was acting as a God method. It was handling file parsing, data validation, object lookup/resolution, and database mutations within a massive transaction block.
  * **Solution:** Extracted logic into `_parse_file`, `_resolve_set`, and `_process_row` helper methods.
* **Separation of Concerns:** `backend/users/views.py` contained raw `os` operations, system `subprocess` calls (`pg_dump`, `pg_restore`), and environment variables hacking directly inside the view methods.
  * **Solution:** Extracted filesystem and subprocess logic into a dedicated `BackupService` (`backend/users/services/backup_service.py`). The view now strictly acts as an HTTP interface, delegating the logic to the service layer.

## 2. Security Issues
* **Path Traversal Vulnerability:** The `validate_filepath` logic for backups used a weak `.startswith()` string check, which is vulnerable to basic traversal attacks.
  * **Solution:** Replaced with `os.path.realpath` and `os.path.commonpath` to ensure the backup file strongly resolves inside the target directory.
* **Information Exposure:** The backup endpoints previously lacked strict validation over `stderr` during `subprocess` exceptions.
  * **Solution:** Handled safely in the `BackupService` with precise Exception messages propagating standard errors without leaking environment state.

## 3. Maintainability & Code Smells
* **Deep Nesting:** The `import_dies` script possessed 5 levels of try/except nesting, rendering it difficult to trace code flow.
  * **Solution:** Helper abstractions greatly flattened the control flow.
* **Duplication:** Backup directory checking logic (`if not os.path.exists(backup_dir)`) was duplicated across several view methods.
  * **Solution:** Centralized within `BackupService`.

## 4. Performance Issues
* **Redundant Iterations:** The backup pruner used `os.listdir()` and individual `os.stat` repeatedly.
  * **Mitigation:** Abstracted to `BackupService.prune_old_backups` to clean up efficiently and safely.
* *Note:* Future refactors should review how Meilisearch index syncing queues Celery tasks, as bulk syncing might overflow the Redis broker under heavy load.

## 5. Testing Gaps
* The current test suite strongly couples to an available PostgreSQL and Meilisearch daemon. Tests instantly crash with `OperationalError` when the database daemon is unavailable.
  * **Recommendation:** Mock the database/meili interactions in unit tests to allow testing of business logic independently, or segregate unit tests and integration tests cleanly.

## 6. Suggested Future Refactors
* **Frontend State Management:** The frontend `InventoryPage.tsx` is over 1,500 lines long. It should be aggressively decomposed into smaller layout and filter components.
* **Django Middleware Abstractions:** Migrate the concurrent session tracking out of `users.middleware` and `users.views` explicitly into an auth-specific service.

## 7. Estimated Maintenance Impact
* **Impact:** High. By enforcing separation of concerns across the service boundaries, bug fixing and unit testing the import and backup layers are now far simpler.
