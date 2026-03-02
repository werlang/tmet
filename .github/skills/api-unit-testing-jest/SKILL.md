---
name: api-unit-testing-jest
description: Write and maintain TMET backend tests with Jest and Supertest. Use when changing routes, models, or helpers and you need to add focused tests under __tests__/routes, __tests__/models, __tests__/helpers, or __tests__/integration.
---

# API Unit Testing with Jest (TMET)

## Use this skill to
- Add regression tests for route validation, status codes, and payload contracts.
- Test model/helper behavior in isolation.
- Keep coverage aligned with changed backend code.

## Test layout
- `__tests__/routes/*`
- `__tests__/models/*`
- `__tests__/helpers/*`
- `__tests__/integration/routes.test.js`
- Shared fixtures/setup: `__tests__/fixtures.js`, `__tests__/setup.js`

## Workflow
1. Locate nearest existing test file for the changed module.
2. Add the smallest meaningful test case first (validation/error path or success path).
3. Run targeted tests before broader suites.
4. Update expectations only when behavior change is intentional and documented.

## Docker-first commands
```bash
docker compose exec node npm test
docker compose exec node npm run test:watch
docker compose exec node npm run test:coverage
```

## Out of scope
- Introducing new test frameworks.
- Adding browser E2E suites that do not exist in this repository.
