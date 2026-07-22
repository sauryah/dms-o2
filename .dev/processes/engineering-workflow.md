# Engineering Workflow

## Purpose
Define the standard workflow for all engineering tasks on DMS-O2.
**Why:** Ensure consistent, quality implementations across all AI agents.
**Read by:** AI agents, engineers.
**Updated:** Rarely, when process changes.

## Workflow Phases

### 1. Understand
- Read the task description completely
- Identify affected modules and services
- Check architecture docs for constraints
- Review related ADRs in `architecture/decisions.md`
- Assess risk level (reversible vs. irreversible)

### 2. Plan
- Break task into implementation steps
- Identify files to create/modify
- Consider security implications
- Estimate complexity and confidence level
- Document approach if confidence <95%

### 3. Review (Before Implementation)
- Verify approach follows established patterns
- Check for existing solutions in codebase
- Confirm no breaking changes to public APIs
- Validate against security rules in `AGENTS.md`

### 4. Implement
- Follow coding standards in `architecture/coding-standards.md`
- Use patterns from `templates/prompts.md`
- Write code incrementally, test as you go
- Keep changes focused and minimal

### 5. Verify
- Run compilation checks (`python manage.py check`, `go build ./...`)
- Execute test suite (`pytest`, `go test ./...`)
- Verify no regressions
- Check for security vulnerabilities

### 6. Document
- Update affected module docs in `modules/`
- Update architecture docs if structural changes
- Add ADR if significant decision made
- Update `changelog-ai.md` with implementation summary

### 7. Complete
- Mark task as done in `state/active-task.md`
- Update `state/progress.md`
- Commit with conventional commit message
- Push and create PR if required

## Implementation Patterns

### Python View Modification
```
Modify [ViewSet/ViewName] to implement [business logic].
Ensure:
1. No raw cursor database queries. Use Django ORM.
2. If mutating state, wrap database transactions using transaction.atomic.
3. Wrap logging inside structured loggers.
4. Ensure all unit tests compile and run.
```

### Go API Search Alteration
```
Modify [go-api/internal/handlers/...] to add [filter/parameter].
Ensure:
1. Input parameters are sanitized using escapeMeiliFilterValue.
2. All connection checks specify a timeout context.
3. Write table-driven unit tests verifying the change.
```

### Frontend Component Modification
```
Modify [ComponentName] to implement [UI logic].
Ensure:
1. Use existing component library and design system.
2. Handle loading and error states.
3. Write unit tests for new functionality.
4. Update Storybook stories if applicable.
```

## Escalation Triggers
Stop and ask for clarification when:
- Confidence <70%
- Business requirements change
- User-visible behavior changes
- Public API contracts change
- Destructive migrations required
- Infrastructure cost changes significantly
