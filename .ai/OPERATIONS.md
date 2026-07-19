# Operations & Maintenance (OPERATIONS.md)

This manual defines operations rules, database verification checks, and cert management procedures for the DMS-O2 system.

---

## 1. Restorer Session Preservation

*   **Rule**: Relational restorations must pre-capture the administrator's session tokens (SHA-256 hash), execute `pg_restore`, run migrations, drop all session database rows, and then recreate the restorer's session.
*   **Why**: Wiping database session tables logs out the user performing the restore, causing redirect loops and verification crashes.
*   **Enforced**: Inside the database restore service.
*   **Files**:
    *   Restore Task caller: [backup.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/views/backup.py#L80-L88)
    *   Restore Task worker: [tasks.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/tasks.py#L27-L48)
    *   Restore Service: [backup_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/services/backup_service.py#L135-L192) (`BackupService.restore_backup`).
*   **Failure Mode**: Restores fail to complete or verify because the administrator's token is invalidated mid-process.
*   **Correct Example (Python)**:
    ```python
    current_session = UserSession.objects.get(user_id=user_id, token_hash=token_hash)
    # Restore DB here
    UserSession.objects.create(
        user_id=restored_user.id,
        token_hash=current_session_data['token_hash'],
        ip_address=current_session_data['ip_address'],
        device=current_session_data['device']
    )
    ```

---

## 2. Backup Integrity & Verification Checks

*   **Rule**: Automated database dumps must pass size checks (>5KB), structures listing checks (`pg_restore -l`), table counts compared with live counts, and write MD5 checksum files.
*   **Why**: Prevents saving corrupt or empty database dumps.
*   **Enforced**: Inside the backup shell script.
*   **Files**:
    *   Backup Container script: [backup_db.sh](file:///home/sahil/Desktop/Projects/dms-o2/scripts/backup_db.sh#L17-L41)
*   **Failure Mode**: Corrupt backup dumps are saved, resulting in restoration failures during emergencies.
*   **Correct Example (Shell)**:
    ```bash
    pg_dump -F c -f "$BACKUP_FILE"
    if [ $(stat -c%s "$BACKUP_FILE") -lt 5120 ]; then
        exit 1
    fi
    pg_restore -l "$BACKUP_FILE" >/dev/null
    ```

---

## 3. Database Client Connections Cleared before Restore

*   **Rule**: The `./dms-backup.sh restore` script must stop `django`, `worker`, and `go-api` services and call `pg_terminate_backend` on postgres.
*   **Why**: Clears active database connections to prevent lock conflicts during pg_restore.
*   **Enforced**: Host-side restore script.
*   **Files**:
    *   Restore Script: [dms-backup.sh](file:///home/sahil/Desktop/Projects/dms-o2/dms-backup.sh#L53-L73)
*   **Failure Mode**: Database drop/restore fails due to locked connections.
*   **Correct Example (Shell)**:
    ```bash
    docker compose stop django worker go-api
    docker compose exec backup psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'dms';"
    ```

---

## 4. Local LAN Certificate Auto-Detection Generation

*   **Rule**: Setup scripts must generate mkcert credentials matching localhost and host LAN IP.
*   **Why**: Enables local HTTPS testing on physical mobile devices or other computers on the same network.
*   **Enforced**: Initial setup scripts.
*   **Files**:
    *   Cert Generator: [generate-certs.sh](file:///home/sahil/Desktop/Projects/dms-o2/scripts/generate-certs.sh) and `generate-certs.bat`.
*   **Failure Mode**: Browsers block local network testing due to untrusted certificate warnings.
