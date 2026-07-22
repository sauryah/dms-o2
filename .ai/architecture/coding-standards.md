# Coding Standards & Conventions

## Purpose
Language-specific coding standards for Python, Go, and TypeScript.
**Why:** Ensure consistent, maintainable code across all services.
**Read by:** AI agents, engineers.
**Updated:** Rarely, when standards change.

## General Principles

### Code Quality
- Write clear, readable code
- Prefer explicit over implicit
- Keep functions small and focused
- Avoid premature optimization
- Document complex logic

### Security First
- Validate all inputs
- Use parameterized queries
- Never hardcode secrets
- Follow principle of least privilege
- Log security events

## Python Standards (Django 4.2)

### Code Style
- Format with `black`
- Lint with `flake8`
- Type hints encouraged
- Docstrings for public functions

### Django Best Practices
- Use Django ORM, never raw SQL
- Wrap mutations in `transaction.atomic`
- Use Django's built-in authentication
- Follow Django's MTV pattern
- Use class-based views when possible

### Example
```python
from django.db import transaction
from django.utils import timezone

class DieRecutView(APIView):
    def post(self, request, die_id):
        with transaction.atomic():
            die = Die.objects.select_for_update().get(id=die_id)
            die.recut(
                new_diameter=request.data['diameter'],
                new_length=request.data['length']
            )
            DieHistory.objects.create(
                die=die,
                action='recut',
                new_values=request.data,
                user=request.user
            )
        return Response({'status': 'success'})
```

### Error Handling
```python
# Good
try:
    die = Die.objects.get(id=die_id)
except Die.DoesNotExist:
    raise NotFound('Die not found')

# Bad
die = Die.objects.get(id=die_id)  # Lets exception bubble as 500
```

### Logging
```python
import logging

logger = logging.getLogger(__name__)

# Good
logger.info("Die recut", extra={
    'die_id': die_id,
    'user_id': request.user.id,
    'old_diameter': old_diameter,
    'new_diameter': new_diameter
})

# Bad
print(f"Die {die_id} recut")  # Never print raw objects
```

## Go Standards (Go 1.22)

### Code Style
- Follow `gofmt` formatting
- Use `golangci-lint` for linting
- Handle all errors explicitly
- Use context for timeouts

### Best Practices
- Use table-driven tests
- Prefer composition over inheritance
- Use interfaces for abstraction
- Keep packages small and focused

### Example
```go
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()
    
    query := r.URL.Query().Get("q")
    if query == "" {
        http.Error(w, "query required", http.StatusBadRequest)
        return
    }
    
    sanitized := escapeMeiliFilterValue(query)
    results, err := h.client.Search(ctx, sanitized)
    if err != nil {
        logger.Error("search failed", "error", err, "query", query)
        http.Error(w, "search failed", http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(results)
}
```

### Error Handling
```go
// Good
result, err := db.QueryContext(ctx, query, args...)
if err != nil {
    return fmt.Errorf("query failed: %w", err)
}

// Bad
result, _ := db.QueryContext(ctx, query, args...)  // Ignores error
```

### Context Usage
```go
// Always pass context
func processData(ctx context.Context, id int) error {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    // Use ctx for all operations
    return nil
}
```

### Search Relevance & Dimension Scoring Standards
- **Never use substring matching on numeric dimension fields**: Do NOT use string `contains` checks on numeric dimension attributes (`CurrentSize`, `CurrentWidth`, `CurrentThickness`). Searching for `25` must NOT match `1.25` or `0.25`.
- **Dimension Matching Rules**:
  1. **Exact Match (Score 100)**: Parse floating point query values (strip `"mm"` unit suffix if present). If parsed float matches `CurrentSize`, `CurrentWidth`, or `CurrentThickness`, return score 100.
  2. **Prefix Match (Score 70)**: Only match dimension text if it equals or starts with the numeric query string (e.g. query `25` matches size `25.4`).
- **Enforce Relevancy Filters on Digit Queries**: If search query contains digits (like a size or ID query), results with score `≤ 50` (fuzzy/rack/shelf matches) MUST be filtered out regardless of whether hits originated from Meilisearch or PostgreSQL fallback.
- **SQL Parameterized Wildcards for Dimensions**: In PostgreSQL queries (`buildWhereClauses`), use prefix wildcards `cleanQ%` for numeric dimension fields (`current_size`, `current_width`, `current_thickness`) when query is numeric, while keeping `%cleanQ%` for text attributes (`die_id`, `casing`, `rack`, `status`).
- **Total Count Accuracy**: For digit/size queries where post-filtering (`score > 50`) is applied, the response `total` count MUST equal the actual count of relevant filtered items (`len(filtered)`), rather than returning Meilisearch's raw estimated total hits (e.g. 1000).

## TypeScript Standards (React 18)

### Code Style
- Use ESLint + Prettier
- Prefer functional components
- Use hooks for state and side effects
- Type everything

### Best Practices
- Keep components small
- Extract custom hooks
- Use React.memo for performance
- Handle loading and error states
- **Centralized Application Versioning**: Do NOT hardcode version strings in UI components (`Footer`, `AboutModal`, `CalculatorPage`, etc.). Always import `APP_VERSION` from `src/version.ts` (which reads from `package.json`). Whenever `package.json` is updated for a release, all UI badges across the application update automatically in sync.

### Example
```typescript
interface DieCardProps {
  die: Die;
  onRecut: (dieId: number) => void;
}

const DieCard: React.FC<DieCardProps> = React.memo(({ die, onRecut }) => {
  const [isRecutting, setIsRecutting] = useState(false);
  
  const handleRecut = useCallback(async () => {
    setIsRecutting(true);
    try {
      await onRecut(die.id);
    } finally {
      setIsRecutting(false);
    }
  }, [die.id, onRecut]);
  
  return (
    <div className="die-card">
      <h3>{die.name}</h3>
      <p>Remaining: {die.predicted_remaining_days} days</p>
      <button onClick={handleRecut} disabled={isRecutting}>
        {isRecutting ? 'Recutting...' : 'Recut'}
      </button>
    </div>
  );
});
```

## Conventions

### Commit Messages
- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Examples:
  - `feat(dies): add recut functionality`
  - `fix(api): handle missing search query`
  - `refactor(auth): simplify token refresh`

### Branch Naming
- Format: `type/short-description`
- Examples:
  - `feature/die-recut`
  - `fix/search-timeout`
  - `refactor/auth-flow`

### File Naming
- Python: `snake_case.py`
- Go: `snake_case.go`
- TypeScript: `camelCase.ts` for functions, `PascalCase.tsx` for components

### Variable Naming
- Python: `snake_case`
- Go: `camelCase`
- TypeScript: `camelCase` for variables, `PascalCase` for types/interfaces

## Testing Standards

### Python Tests
```python
import pytest
from django.test import TestCase

class TestDieRecut(TestCase):
    def test_recut_updates_dimensions(self):
        die = create_die(diameter=10.0, length=5.0)
        die.recut(new_diameter=9.5, new_length=4.8)
        self.assertEqual(die.current_diameter, 9.5)
    
    def test_recut_creates_history(self):
        die = create_die()
        die.recut(new_diameter=9.5, new_length=4.8)
        self.assertEqual(die.history.count(), 1)
```

### Go Tests
```go
func TestSearch(t *testing.T) {
    tests := []struct {
        name     string
        query    string
        expected int
    }{
        {"basic search", "machine", 5},
        {"empty query", "", 0},
        {"special chars", "test<script>", 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            results := search(tt.query)
            if len(results) != tt.expected {
                t.Errorf("got %d results, want %d", len(results), tt.expected)
            }
        })
    }
}
```

### TypeScript Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DieCard } from './DieCard';

test('shows recutting state', async () => {
  const die = { id: 1, name: 'Test Die' };
  const onRecut = jest.fn();
  
  render(<DieCard die={die} onRecut={onRecut} />);
  
  fireEvent.click(screen.getByText('Recut'));
  expect(screen.getByText('Recutting...')).toBeInTheDocument();
});
```
