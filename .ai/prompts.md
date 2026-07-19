# LLM Prompt Engineering Templates (prompts.md)

Use these guidelines when instructing AI agents to modify backend or frontend modules:

## Python View Modification
```
Modify [ViewSet/ViewName] to implement [business logic]. 
Ensure:
1. No raw cursor database queries. Use Django ORM.
2. If mutating state, wrap database transactions using transaction.atomic.
3. Wrap logging inside structured loggers.
4. Ensure all unit tests compile and run.
```

## Go API Search Alteration
```
Modify [go-api/internal/handlers/...] to add [filter/parameter].
Ensure:
1. Input parameters are sanitized using escapeMeiliFilterValue.
2. All connection checks specify a timeout context.
3. Write table-driven unit tests verifying the change.
```
