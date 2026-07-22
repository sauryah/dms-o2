# Definition of Done

## Purpose
Define completion criteria for all engineering tasks.
**Why:** Ensure consistent quality and completeness across all implementations.
**Read by:** AI agents, engineers.
**Updated:** Rarely, when process changes.

## Universal Done Criteria

### Code Quality
- [ ] Code compiles/builds without errors
- [ ] No new compiler warnings
- [ ] Follows coding standards in `architecture/coding-standards.md`
- [ ] Consistent with existing patterns
- [ ] No code duplication

### Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Test coverage maintains or improves
- [ ] Edge cases covered
- [ ] Error conditions tested

### Documentation
- [ ] Module docs updated if module changed
- [ ] Architecture docs updated if structure changed
- [ ] ADR created if significant decision made
- [ ] changelog-ai.md updated with summary
- [ ] Inline comments for complex logic

### Security
- [ ] Input validation implemented
- [ ] SQL injection prevented
- [ ] XSS prevention in place
- [ ] CSRF protection maintained
- [ ] No secrets in code or logs
- [ ] Authentication/authorization correct

### Performance
- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] Resource usage acceptable

### Deployment
- [ ] Changes are backward compatible
- [ ] Database migrations are reversible
- [ ] Configuration changes documented
- [ ] Rollback plan considered

## Task-Specific Done Criteria

### Bug Fix
- [ ] Root cause identified and fixed
- [ ] Regression test added
- [ ] No side effects
- [ ] Related tests updated

### New Feature
- [ ] Feature matches requirements
- [ ] All edge cases handled
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Performance acceptable
- [ ] User-facing documentation updated

### Refactoring
- [ ] Behavior unchanged
- [ ] Tests still pass
- [ ] Code readability improved
- [ ] No performance degradation
- [ ] Related documentation updated

### Security Patch
- [ ] Vulnerability addressed
- [ ] No new vulnerabilities introduced
- [ ] Security testing performed
- [ ] Documentation updated
- [ ] Security team notified if required

## Verification Steps

### Automated Verification
1. Run `python manage.py check` (Django)
2. Run `go build ./...` (Go)
3. Run `npm run build` (Frontend)
4. Run `pytest` (Python tests)
5. Run `go test ./...` (Go tests)
6. Run `npm test` (Frontend tests)

### Manual Verification
1. Test in development environment
2. Verify UI/UX matches requirements
3. Check error messages are clear
4. Verify logging output
5. Test edge cases manually

## Completion Checklist

### Before Marking Done
- [ ] All universal criteria met
- [ ] Task-specific criteria met
- [ ] Automated verification passes
- [ ] Manual verification passes
- [ ] Review gates passed (see `processes/review-process.md`)
- [ ] Documentation updated
- [ ] State files updated

### After Marking Done
- [ ] Commit with conventional message
- [ ] Push to remote
- [ ] Create PR if required
- [ ] Notify stakeholders if significant
- [ ] Update roadmap if major feature

## Quality Gates

| Metric | Threshold | Action if Failed |
|--------|-----------|------------------|
| Test Coverage | ≥80% | Add tests before merge |
| Build Success | 100% | Fix before merge |
| Security Scan | 0 critical | Fix before merge |
| Performance | No regression | Investigate before merge |
