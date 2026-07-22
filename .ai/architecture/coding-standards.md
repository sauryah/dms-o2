# Coding Standards & Conventions (coding-standards.md)

## Conventions
- **Conventional Commits**: Format commit messages strictly as `feat: ...`, `fix: ...`, `refactor: ...`.
- **Formatting**: Format Python using `black` and lint with `flake8`.
- **Database Safety**: Never write migrations modifying constraints without wrapping writes in atomic blocks.
- **Logging**: Never print raw objects. Use structured logging (`logger.info("Message", extra={...})` in Python or `slog` in Go).
- **Error Propagation**: Always raise distinct validation exceptions in services instead of letting database driver errors bubble up as 500s.
