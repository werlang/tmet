---
name: api-unit-testing-jest
description: Write and maintain TMET Jest + Supertest tests. Use when changing routes, models, helpers, queue logic, file parsing, or API contracts and you need focused coverage under tests/routes, tests/models, tests/helpers, or tests/integration.
---

# API Unit Testing with Jest (TMET)

## Use this skill to
- Add regression coverage for route validation, status codes, payloads, and queue orchestration.
- Test model/helper behavior in isolation with mocked filesystem, network, or Browserless boundaries.
- Keep backend changes aligned with the existing Jest suite instead of inventing a new test harness.

## Test layout
- `tests/routes/*`
- `tests/models/*`
- `tests/helpers/*`
- `tests/integration/routes.test.js`
- Shared helpers: `tests/setup.js`, `tests/fixtures.js`
- Config: `jest.config.js`

## Existing patterns to reuse
- Use `jest.unstable_mockModule(...)` for ESM dependency mocking.
- Use `createMockRequest(...)` and `createMockResponse()` from `tests/setup.js` for route handler tests.
- Use `suppressConsole()` in suites that intentionally exercise error paths or noisy progress logging.

## Workflow
1. Start from the nearest existing test file for the touched route, model, or helper.
2. Cover one meaningful behavior at a time: validation, success path, queue callback, or artifact-writing side effect.
3. Mock unstable boundaries explicitly: filesystem, fetch, Browserless, or Moodle upload helpers.
4. Run the narrowest relevant test file first, then widen only if the change crosses module boundaries.

## Commands
```bash
npm test -- tests/routes/moodleRoute.test.js
npm test -- tests/models/MoodleModel.test.js
docker compose exec node npm test -- tests/integration/routes.test.js
```

## Out of scope
- Introducing new test frameworks.
- Browser E2E infrastructure that does not exist in this repository.
