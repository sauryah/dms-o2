# DMS-O2 AI Agent Operations Manual (AGENTS.md)

## Project Overview
DMS-O2 is an industrial-grade Die Management System designed to track precision tooling assets, dimensions wear rates, and coordinates placement layout.

## Technology Stack
- Backend: Django 4.2 + Go 1.22
- Databases: PostgreSQL 18 + Redis 7
- Search Engine: Meilisearch v1.7
- Frontend: React 18 + Vite

## Architecture Summary
The platform splits write paths (Django transactions, auditing, backups) and read paths (Go search query proxy, SSE real-time listener events).

## Security Rules
1.  All container processes execute as non-root user (`USER dmsuser`).
2.  Mutating APIs using cookies require `X-Requested-With: XMLHttpRequest`.
3.  Outbox task payloads are signed using HMAC-SHA256 signatures, validated before execution.
4.  Startup validation prevents launching in production mode (`DJANGO_DEBUG=False`) with default insecure credentials.

## AI Behavior Rules
Future engineering agents must:
- Analyze codebase and documentation before modifying files.
- Preserve transactional outbox and event loop architectures.
- Run Go and Python compilation checks to verify modifications.
- Automatically update relevant documents inside `.ai/` and `wiki/` upon implementation.
