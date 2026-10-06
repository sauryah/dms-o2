# Django users Module (users.md)

## Purpose
Handles user authentication, JWT token lifecycle, profile management, active sessions, user activity audit logging, database backups, single-use hashed recovery backup codes (`UserBackupCode`), and granular sub-feature tool authorization tree (`is_authorized_for_tools`, `authorized_tools`).

## Important Files
- [models.py](file:///backend/users/models.py): Schema definitions for `User`, `UserSession`, `UserActivityLog`, and `UserBackupCode`.
- [auth.py](file:///backend/users/views/auth.py): Login/logout, refresh tokens, SSE ticket generation, backup code generation/verification views, and reverse-proxy IP attribution.
- [profile.py](file:///backend/users/views/profile.py): User profile details, password updates, and avatar handling.
- [views.py](file:///backend/users/views.py): UserViewSet with `tools_permissions`, `toggle_permission`, and bulk `terminate-sessions` endpoints.
- [reset_mfa.py](file:///backend/users/management/commands/reset_mfa.py): Administrative CLI command to purge depleted/lost MFA backup codes and restore account access.
- [permissions.py](file:///backend/users/permissions.py): Custom RBAC permission classes (`IsRootUser`, `IsAdminOrRoot`, `IsAdminOrRootOrOperatorRelocate`, `IsOperatorOrAbove`) with safe-method authentication enforcement.

## Key Security Policies
- **Single-Use Backup Codes MFA**: Replaces traditional third-party TOTP authenticators with 10 cryptographically random, 8-character single-use recovery codes (`XXXX-XXXX`). Codes are normalized and hashed with SHA-256 before storage in `UserBackupCode`. Depleted codes block login attempts (HTTP 403).
- **Session Eviction on Permission Change**: When an administrator updates a user's role or tool permissions, all active refresh tokens and browser sessions for that user are immediately invalidated and purged from `UserSession`.
- **Safe-Method Authentication Enforcement**: Read-only operations (`GET`, `HEAD`, `OPTIONS`) on protected endpoints require valid authentication, returning HTTP 401 Unauthorized instead of leaking permission denials (HTTP 403) to anonymous callers.


