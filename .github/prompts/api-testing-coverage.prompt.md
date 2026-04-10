---
description: "Expand TMET Jest coverage for backend routes, models, and helpers. Use when improving tests for queue-driven APIs, file-backed models, or integration helpers under tests/."
name: "TMET API Testing Coverage"
argument-hint: "Optional files, routes, or coverage target"
agent: "agent"
tools: [read, search, edit, execute]
---

Expand and harden TMET backend test coverage using the existing Jest + Supertest setup.

## Scope
- `tests/routes/**`
- `tests/models/**`
- `tests/helpers/**`
- `tests/integration/**`
- Touched production files in `routes/`, `models/`, and `helpers/`

## Repository-specific rules
1. Reuse existing ESM test patterns such as `jest.unstable_mockModule(...)`.
2. Reuse `tests/setup.js` helpers for route handler tests when applicable.
3. Keep tests deterministic by mocking filesystem, Browserless, fetch, timers, and Moodle upload boundaries.
4. Prioritize queue/job polling flows and file-artifact side effects when they are part of the feature.
5. Only fix production code when the failing test proves a real defect.

## Commands
```bash
docker compose exec node npm test
docker compose exec node npm run test:coverage
```

## Required output
```markdown
## TMET API Coverage Report

### Files Changed
- [path] - reason

### Coverage Improvements
- [module] - branches or behaviors added

### Flows Validated
- [route/model/helper] - behavior covered

### Production Fixes
- [path] - defect proven by test

### Remaining Gaps
- [path] - rationale
```
