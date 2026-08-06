---
name: api-functional-testing
description: Validate TMET API contracts and multi-step flows, especially async job polling, generated file artifacts, and extraction -> matching -> enrollment workflows. Use when verifying behavior across routes, models, helpers, queue progress, and persisted outputs in files/.
---

# API Functional Testing (TMET)

## Use this skill to
- Validate route + model + helper behavior together for the real TMET pipeline.
- Confirm async operations return `202` and remain observable through `/api/jobs/:jobId`.
- Check only the artifact files that the tested flow is supposed to create or consume.

## High-value flows
- `POST /api/moodle/csv` -> `GET /api/jobs/:jobId` -> `files/moodle_classes.csv`
- `POST /api/suap/extract` -> `GET /api/jobs/:jobId` -> `files/suap_subjects.json`
- `GET /api/matches` / `POST /api/matches` -> `files/matches.json`
- `POST /api/ai/match` -> `GET /api/jobs/:jobId`
- `POST /api/suap/extract-students` -> `files/suap_students.json` and/or `files/suap_professors.json`
- `POST /api/moodle/students-csv`, `manual-students-csv`, `professors-csv`, `manual-courses-csv`
- `POST /api/moodle/courses`, `students`, `professors`

## Workflow
1. Pick one user-visible workflow and identify its expected file outputs and follow-up endpoints.
2. Verify the start response contract first: `success`, `jobId`, `message`, and `statusUrl` when async.
3. Poll `/api/jobs/:jobId` until completion or failure.
4. Check generated files only when they are part of the contract for that flow.
5. Confirm manual queue behavior separately from the main extraction flow when testing `manual-courses` or `manual-student` endpoints.

## Commands
```bash
docker compose up -d --build
docker compose exec node npm test -- tests/integration/routes.test.js
docker compose exec node npm test -- tests/routes/moodleRoute.test.js
```

## Out of scope
- Performance or load testing infrastructure.
- Contract tests for services outside this repository.
