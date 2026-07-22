# Review Process

## Purpose
Define review gates and checklists for all implementations.
**Why:** Ensure quality and consistency across all changes.
**Read by:** AI agents, engineers.
**Updated:** Rarely, when process changes.

## Review Gates

### Gate 1: Compilation/Build
**When:** Before any code changes are committed.
**Checklist:**
- [ ] Python: `python manage.py check` passes
- [ ] Go: `go build ./...` succeeds
- [ ] Frontend: `npm run build` completes without errors
- [ ] No new compiler warnings introduced

### Gate 2: Test Execution
**When:** After implementation, before commit.
**Checklist:**
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Test coverage maintains or improves
- [ ] No test flakiness introduced

### Gate 3: Architecture Review
**When:** Structural changes, new modules, or significant refactoring.
**Checklist:**
- [ ] Changes follow established patterns
- [ ] No breaking changes to public APIs
- [ ] Data flow remains consistent
- [ ] Security implications considered
- [ ] Performance impact assessed

### Gate 4: Security Review
**When:** Authentication, authorization, data access, or API changes.
**Checklist:**
- [ ] Input validation implemented
- [ ] SQL injection prevented (ORM usage)
- [ ] XSS prevention in place
- [ ] CSRF protection maintained
- [ ] Sensitive data handled properly
- [ ] No secrets in code or logs

### Gate 5: Documentation Update
**When:** Any change that affects understanding of the system.
**Checklist:**
- [ ] Module docs updated if module changed
- [ ] Architecture docs updated if structure changed
- [ ] ADR created if significant decision made
- [ ] changelog-ai.md updated with summary

## Review Checklists by Change Type

### New Feature
- [ ] All 5 gates pass
- [ ] Feature matches requirements
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Performance acceptable

### Bug Fix
- [ ] Gate 1, 2, 5 pass
- [ ] Root cause identified
- [ ] Fix addresses root cause
- [ ] Regression test added
- [ ] No side effects

### Refactoring
- [ ] Gate 1, 2, 3 pass
- [ ] Behavior unchanged
- [ ] Tests still pass
- [ ] Code readability improved
- [ ] No performance degradation

### Security Patch
- [ ] All 5 gates pass
- [ ] Vulnerability addressed
- [ ] No new vulnerabilities introduced
- [ ] Security testing performed
- [ ] Documentation updated

## Approval Requirements

| Change Type | Approval Required |
|-------------|-------------------|
| New Feature | Code review + Architecture review |
| Bug Fix | Code review |
| Refactoring | Code review |
| Security Patch | Code review + Security review |
| Architecture Change | Architecture review + Security review |

## Review Comments
- All review comments must be addressed before merge
- Disagreements documented in ADR
- Security concerns escalated immediately
