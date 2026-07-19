# DMS-O2 Project Overview (project.md)

## What is this?
DMS-O2 is an industrial-grade **Die Management System** designed to replace manual, unstructured Excel spreadsheets for tracking precision extrusion and wire-drawing dies on discrete manufacturing shop floors. 

## Why does it exist?
Extrusion dies are high-value, highly calibrated toolings that deform and wear down under high pressure and temperature. Tracking their physical dimensions, operational statuses, physical rack locations, and audit trails is critical for quality control standards (e.g. ISO 9001, IATF 16949) and preventing production halted downtime.

## How does it work?
The system utilizes a split architecture:
- **Write-Path**: Django + PostgreSQL handles relational updates, audit logs triggers, backups, and user management.
- **Read-Path**: A Go API microservice proxies search queries and lists directly from a local Meilisearch index and Redis cache.
- **Real-Time Sync**: Changes to the database trigger PostgreSQL NOTIFY actions, which are intercepted by a Go event listener and broadcast to all active browser clients via Server-Sent Events (SSE).

## Interaction
```
[React SPA Frontend] <---(SSE Events)--- [Go API Event Stream] <---(PG Notify)--- [PostgreSQL]
        |                                       |
        +---(Search & Read Requests)------------+
        |
        +---(Mutating API Actions)-------------> [Django Gunicorn]
```
