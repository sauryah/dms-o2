# Resolved & Known Defects (KNOWN_BUGS.md)

This document tracks historically resolved defects, current troubleshooting guides, and workarounds.

---

## 1. Historically Resolved Defects

### 1.1 Privilege Escalation in Profile PATCH Requests
*   **Problem**: Non-ROOT users could elevate their roles during self-profile PATCH updates.
*   **Resolution**: Added validation checks to `UserSerializer` (`profile.py`) that restrict modifying `role`, `is_authorized_for_tools`, or `authorized_tools` to ROOT users.

### 1.2 Database Backup NameError Crashes
*   **Problem**: Delete and download actions in `BackupViewSet` crashed with a `NameError` due to missing import statements.
*   **Resolution**: Restructured `BackupViewSet` to delegate operations to `BackupService` and validation routines.

### 1.3 Virtual Adapter LAN IP Selection
*   **Problem**: Certificate scripts (`generate-certs.bat`/`setup.ps1`) picked up virtual network adapter IPs (WSL/Docker/Hyper-V) instead of the host machine's actual LAN IP.
*   **Resolution**: Enhanced interface scanning to filter out adapter descriptions matching virtual adapter keywords.

### 1.4 Test Transaction Contamination
*   **Problem**: Global `ATOMIC_REQUESTS` in test environments contaminated assertions, causing test runs to fail.
*   **Resolution**: Disabled global `ATOMIC_REQUESTS` in test settings, using explicit transaction blocks inside serializers instead.

### 1.5 Playwright E2E Login Timeouts
*   **Problem**: Playwright integration checks timed out when testing auth runs in container builds.
*   **Resolution**: Refactored Playwright locators to use static test credentials (`root123`).

---

## 2. Troubleshooting Operational Guides

### 2.1 Mismatched Search Index Counts
*   **Symptoms**: Go API health checks return status `out_of_sync` for Meilisearch.
*   **Action**: Run index synchronization commands to rebuild Meilisearch:
    ```bash
    make sync-search
    ```

### 2.2 Broken SSE Connection (Expired Tickets)
*   **Symptoms**: Browser fails to connect to `/api/events/` and receives `401 Unauthorized` responses.
*   **Action**: Ensure tickets are requested via a `POST /api/v1/auth/sse-ticket/` immediately before connecting, as SSE tickets expire in Redis after 30 seconds.
