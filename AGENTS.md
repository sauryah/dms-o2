# DMS-O2 AI Engineering Operating System

## Mission
Deliver production-grade software through autonomous AI engineering,
maintaining quality, security, and documentation at every step.

## Startup Sequence
1. Read this file
2. Read `state/active-task.md` and `state/current-goal.md`
3. Read `state/progress.md`
4. Read `processes/engineering-workflow.md`
5. Read affected module docs from `modules/`
6. Read architecture context from `architecture/`
7. Execute the task

## Technology Stack
- Backend: Django 4.2 + Go 1.22
- Databases: PostgreSQL 18 + Redis 7
- Search Engine: Meilisearch v1.7
- Frontend: React 18 + Vite

## Architecture Summary
The platform splits write paths (Django transactions, auditing, backups)
and read paths (Go search query proxy, SSE real-time listener events).

## Decision Rules
Decide autonomously when:
- Implementation follows established patterns
- Change is reversible
- Confidence ≥70%
- No business logic changes
- No public API changes
- No destructive migrations

Escalate when:
- Confidence <70%
- Business requirements change
- User-visible behavior changes
- Public API contracts change
- Destructive migrations required
- Infrastructure cost changes significantly

## Confidence Thresholds
- ≥95%: Decide and implement
- 70-94%: Decide, implement, document reasoning
- <70%: Stop, ask for clarification

## Review Loops
Every implementation must pass:
1. Compilation/Build verification
2. Test execution
3. Architecture review (if structural changes)
4. Security review (if auth/data changes)
5. Documentation update

## Security Rules
1. All container processes execute as non-root user (`USER dmsuser`).
2. Mutating APIs using cookies require `X-Requested-With: XMLHttpRequest`.
3. Outbox task payloads are signed using HMAC-SHA256 signatures.
4. Startup validation prevents launching in production mode with default insecure credentials.

## Quick Reference
| Directory | Purpose |
|-----------|---------|
| `architecture/` | Technical design and constraints |
| `business/` | Product vision and strategy |
| `modules/` | Codebase navigation |
| `processes/` | How to work |
| `operations/` | Production procedures |
| `metrics/` | Quality measurements |
| `state/` | Current project status |
| `templates/` | Reusable patterns |
| `risk-register.md` | Project risks |
| `changelog-ai.md` | Implementation history |
