# Architecture Decision Records (decisions.md)

## ADR 1: Hybrid Write/Read Service Split
*   **Date**: 2026-06-15
*   **Problem**: High concurrent search queries degrade Gunicorn web server write-path performance.
*   **Decision**: Decouple database reads. Django Gunicorn handles mutations; Go API microservice handles search and event streams using Meilisearch.

## ADR 2: Transactional Outbox Pattern
*   **Date**: 2026-06-15
*   **Problem**: Direct search index updates inside views result in dirty reads if database transactions roll back.
*   **Decision**: Write index syncing tasks to an `OutboxTask` database table inside active database transactions, executing synchronization asynchronously.

## ADR 3: Outbox Payload Cryptographic Hashing
*   **Date**: 2026-07-19
*   **Problem**: Danger of database payload modifications or SQL injections executing malicious tasks.
*   **Decision**: Sign outbox payloads with a SHA-256 HMAC signature at creation, validating it when the outbox processor runs.

## ADR 4: Security Headers & Request Limits
*   **Date**: 2026-07-22
*   **Problem**: Missing security headers and request size limits expose the Go API to potential attacks (MIME sniffing, clickjacking, DoS via oversized payloads).
*   **Decision**: Implement production-standard security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`) and enforce 10MB request body size limit. Apply server timeouts (ReadHeader: 10s, Read: 30s, Write: 30s, Idle: 120s).

## ADR 5: Redis Persistence & Resource Limits
*   **Date**: 2026-07-22
*   **Problem**: Redis uses default RDB persistence only, risking data loss on crash. Docker services lack resource limits, risking OOM kills and resource starvation.
*   **Decision**: Enable Redis AOF persistence with `appendfsync everysec` for durability. Add Docker resource limits (memory and CPU) to all services to prevent resource exhaustion. Add Redis maxmemory limit (256MB) with LRU eviction policy.

## ADR 6: Dual-Theme Architecture (Dark Terminal & Classic Slate) with ROOT-Only Access Control
*   **Date**: 2026-08-14
*   **Problem**: The platform requires a high-density "Dark Terminal / Bloomberg-Tape" visual design for manufacturing telemetry, while also allowing operators to switch back to the "Classic Slate" modern industrial theme if desired, without fragmenting component implementations or allowing unauthorized users to modify system-wide appearance.
*   **Decision**: Implement a unified theme provider (`ThemeContext.tsx`) and CSS custom property architecture (`[data-theme="terminal"]` vs `[data-theme="classic"]`). All UI primitives map to standard tokens (`var(--color-bg)`, `var(--color-surface)`, `var(--color-running)`). Enforce strict authorization allowing only users with `role === 'ROOT'` to switch or configure the application theme. Synchronize active theme system-wide across tabs via `localStorage`.

## ADR 7: Redis Pub/Sub Distributed SSE Multiplexing
*   **Date**: 2026-08-22
*   **Problem**: Single-node in-memory event channels prevent horizontal scaling of Go API SSE listeners across multiple replicas.
*   **Decision**: Multiplex PostgreSQL `LISTEN dms_events` through a distributed Redis Pub/Sub channel (`dms:events:broadcast`) so all Go API instances receive and broadcast events to their local clients.

## ADR 8: Single-Use Backup Codes Replacing Mobile TOTP Authenticator
*   **Date**: 2026-08-30
*   **Problem**: Factory shop-floor operators cannot always carry or use smartphones with authenticator apps inside cleanrooms or hazardous zones, leading to lockout issues.
*   **Decision**: Replace TOTP authentication with cryptographically hashed (SHA-256) single-use backup recovery codes (`UserBackupCode`). Provide an emergency administrator unlock CLI command (`python manage.py reset_mfa <username>`) for non-interactive recovery.

## ADR 9: O(1) Search Cache Invalidation via Atomic Generation Counter
*   **Date**: 2026-09-19
*   **Problem**: Tracking and deleting thousands of search cache keys via Redis Set lookups or keyspace scanning degrades throughput on high-frequency die status changes.
*   **Decision**: Introduce an atomic 64-bit generation counter (`search_cache_gen`). Invalidation executes a single atomic `INCR search_cache_gen`, making all prior cached results immediate cache-misses in $O(1)$ time and allowing them to passively expire via Redis TTL.

## ADR 10: Polyglot Rust / WebAssembly FEA Solver & Tooling Streamlining
*   **Date**: 2026-09-21
*   **Problem**: Simulating non-linear Ludwik-Hollomon strain hardening and von Mises stress tensors in real-time JavaScript causes main-thread frame drops. Maintaining separate experimental microservices (Julia, C Edge Gateway) introduced excessive operational overhead.
*   **Decision**: Implement a client-side Rust/WebAssembly volumetric FEA solver (`wasm-drawing-engine/`) exporting zero-copy linear memory buffers (`Float32Array`) directly to WebGL/Canvas. Decommission experimental live telemetry and Julia metallurgy microservices, focusing the platform strictly on the Rust/Wasm Wire Drawing Workbench (`TOOL-01`) and Die Series Generator (`TOOL-02`).

## ADR 11: 100% Self-Hosted Local Typography & Privacy Hardening
*   **Date**: 2026-09-24
*   **Problem**: External calls to Google Fonts and Sentry violated strict air-gap compliance on disconnected industrial local area networks.
*   **Decision**: Serve Inter and Plus Jakarta Sans exclusively as local WOFF2 binaries from `frontend/public/fonts/`. Completely remove Sentry SDK dependencies from frontend and backend, enforcing zero third-party network egress.

## ADR 12: LAN Dynamic Subnet Matching & Standalone Native Client Installer
*   **Date**: 2026-09-26
*   **Problem**: Dynamic DHCP IP assignments on shop-floor routers caused `400 Bad Request` host mismatches. Installing Root CAs and browser enterprise policies manually across multiple workstation PCs was error-prone.
*   **Decision**: Implement `PrivateNetworkHostMatcher` in Django settings to dynamically accept RFC 1918 private subnets and `.local` hostnames. Build a standalone native C# WinForms utility `DMS-Client-Setup.exe` automating root CA installation, browser enterprise policy configuration, and desktop shortcut creation.

## ADR 13: Technical Data Sheet (TDS) Pure Vector SVG Print Reporting
*   **Date**: 2026-10-06
*   **Problem**: Dark-theme canvas charts and Recharts components rasterized poorly and suffered from `ResizeObserver` collapse bugs during browser printing.
*   **Decision**: Implement a dedicated white-paper Technical Data Sheet (TDS) reporting system featuring multi-row vector schematic deformation pipelines (`PrintSchematicPipeline.tsx`), pure vector SVG pass graphs (`PrintPassChart.tsx`), and a preview modal (`PrintPreviewModal.tsx`), coupled with strict `@media print` CSS rules.

