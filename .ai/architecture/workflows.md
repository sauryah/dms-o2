# Business Logic & Workflows (workflows.md)

## 1. Spreadsheet Bulk Import
1.  Admin uploads CSV/XLSX.
2.  Django imports file and processes row-by-row inside database savepoints.
3.  Successful rows commit; failed rows roll back and populate an error array.
4.  Outbox tasks sync updated documents to Meilisearch.

## 2. Die Recutting
1.  Technician re-bores a worn die to a larger size.
2.  Sends request to `/api/dies/{id}/recut/` specifying the new punched and current dimensions.
3.  Django writes a `RECUT` category maintenance log and updates the core `Die` dimensions.

## 3. Real-Time Status Transitions
1.  Operator shifts status to `RUNNING` or `CLEANING`.
2.  PostgreSQL triggers write an `OutboxTask` and invoke `pg_notify`.
3.  Go microservice pushes the update to SSE streams.
4.  All connected client UIs refresh immediately.
