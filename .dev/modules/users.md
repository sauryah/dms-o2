# Django users Module (users.md)

## Purpose
Handles user authentication, JWT lifecycle verification, profiles management, active sessions, user activity audit logging, database backups, and granular sub-feature tool authorization tree (`is_authorized_for_tools`, `authorized_tools`).

## Important Files
- [models.py](file:///backend/users/models.py): User, UserSession, and UserActivityLog schema definitions.
- [auth.py](file:///backend/users/views/auth.py): Login/logout, refresh token, SSE ticket, and token verification views.
- [views.py](file:///backend/users/views.py): UserViewSet with `tools_permissions` and `toggle_permission` endpoints.

