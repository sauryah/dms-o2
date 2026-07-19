# Pre-Commit Engineering Review Checklist (review-checklist.md)

Before considering any task complete, verify the following:

- [ ] **Compilation**: All services compile cleanly.
- [ ] **Migrations**: Database migrations are generated and applied.
- [ ] **Transactions**: Mutating operations run inside `transaction.atomic` blocks.
- [ ] **Security**: Inputs are sanitized; token cache key TTL is handled securely.
- [ ] **Logging**: All warnings and errors use structured loggers.
- [ ] **Documentation**: Updated architecture guides, roadmap changelogs, and ADR files where necessary.
- [ ] **Verification**: Verified using test commands or compilation checks.
