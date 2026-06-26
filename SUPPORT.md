# Support Guide

We want to ensure you have a smooth experience using the Die Management System (DMS). Here is how you can get support:

---

## 📖 Troubleshooting First

Before reaching out, check the following resources:
1.  **Troubleshooting Table**: Review the common issues listed in the [README.md](README.md#️-troubleshooting-guide).
2.  **Architecture Specifications**: Review the [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand backend endpoints, Go Search logic, and Redis caching behaviors.

---

## 🙋 Open a Github Issue

If you encounter a bug or need help:
*   Search current [Issues](https://github.com/your-username/dms/issues) to see if it has already been reported.
*   If not, open a new Issue using the appropriate bug template.
*   **Be Descriptive**: Include logs, environment configuration, database versions, and steps to reproduce.

---

## ⚙️ Direct Admin Actions

If services or indices fall out of sync:
*   **Search Indices**: Sync Meilisearch by running:
    ```bash
    docker compose exec django python manage.py sync_search
    ```
*   **Prune Idle Sessions**: Force prune idle sessions by running:
    ```bash
    docker compose exec django python manage.py expire_sessions
    ```
*   **Restore Database**: Revert to a stable state using the backup script:
    ```bash
    ./dms-backup.sh restore <backup_name>.dump
    ```
