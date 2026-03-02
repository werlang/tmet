# TMET API Testing Coverage Prompt

Expand and harden API test coverage for TMET using Jest + Supertest.

## Objective

Improve coverage for `routes/`, `models/`, and `helpers/` with deterministic tests and minimal, validated production fixes only when tests prove defects.

## Scope

- Tests in `__tests__/routes/**`, `__tests__/models/**`, `__tests__/helpers/**`, `__tests__/integration/**`
- API surfaces mounted under:
  - `/api/matches`
  - `/api/moodle`
  - `/api/suap`
  - `/api/ai`
  - `/api/jobs`

## Commands (Docker-first)

```bash
docker compose exec node npm test
docker compose exec node npm run test:watch
docker compose exec node npm run test:coverage
```

## Rules

1. Keep tests deterministic (mock external boundaries and unstable timing).
2. Prioritize weakest coverage modules first.
3. Validate async job flow endpoints that return `202` and `statusUrl` polling.
4. Only fix production code when failing tests demonstrate real defects.
5. Avoid unrelated refactors while raising coverage.

## Iteration Workflow

1. Run baseline coverage.
2. Identify low-coverage files and branch gaps.
3. Add targeted tests for one batch.
4. Re-run tests/coverage.
5. Repeat until requested scope is sufficiently covered.

## Required Output

```markdown
## TMET API Coverage Report

### Coverage Delta
- Statements: before -> after
- Branches: before -> after
- Functions: before -> after
- Lines: before -> after

### Files Changed
- [path] - reason

### Flows Validated
- [route/model/helper] - happy/error branches covered

### Production Fixes (if any)
- [path] - defect proven by test + minimal fix

### Remaining Gaps
- [path] - rationale

### Commands Executed
- `docker compose exec node npm test`
- `docker compose exec node npm run test:coverage`
```
