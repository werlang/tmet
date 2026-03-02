---
name: api-functional-testing
description: Validate TMET API contracts and multi-step flows, especially async job workflows with polling. Use when verifying endpoint behavior across routes, queue progress, and persisted output files.
---

# API Functional Testing (TMET)

## Use this skill to
- Validate end-to-end API flows spanning route + model + helper boundaries.
- Confirm async operations return `202` and are observable through `/api/jobs/:jobId`.
- Check generated artifacts in `files/` when workflow outputs are expected.

## Key API surfaces
- `/api/matches`
- `/api/moodle`
- `/api/suap`
- `/api/ai`
- `/api/jobs`

## Workflow
1. Start with one user-visible flow (example: `POST /api/moodle/csv` then `GET /api/jobs/:jobId`).
2. Verify response contracts (`success`, `jobId`, `statusUrl`, expected error shape).
3. Poll job endpoint until completion/failure where applicable.
4. Validate side effects (`files/*.csv`, `files/*.json`) only when produced by the tested flow.

## Docker-first commands
```bash
docker compose up -d --build
docker compose exec node npm test -- --runInBand __tests__/integration/routes.test.js
```

## Out of scope
- Performance/load testing infrastructure.
- Cross-service contract tests for services not in this compose stack.
