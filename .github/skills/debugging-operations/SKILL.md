---
name: debugging-operations
description: Diagnose TMET runtime, queue, scraping, upload, and file-artifact issues. Use when investigating failing routes, stuck jobs, broken Browserless/SUAP flows, malformed CSV or JSON outputs, Docker problems, or test regressions.
---

# Debugging and Operations (TMET)

## Use this skill to
- Triage backend failures in `routes/`, `models/`, and `helpers/`.
- Investigate queue lifecycle issues in `helpers/queue.js` and `/api/jobs/:jobId`.
- Diagnose broken pipeline artifacts in `files/*.json` and `files/*.csv`.

## Fast triage flow
1. Reproduce with the smallest route call, test file, or model method that still shows the problem.
2. Check `docker compose logs -f node` and the closest failing test.
3. Confirm queue state through `/api/jobs/:jobId` when the bug involves async work.
4. Inspect the specific generated file involved instead of assuming the wrong stage failed.
5. Verify environment variables only for the integrations that the failing flow actually touches.

## Common hotspots
- `helpers/scraper.js` + `config/suap-config.js` for SUAP login/session issues
- `helpers/timetables.js` for EduPage extraction issues
- `helpers/moodle-uploader.js` for Moodle upload failures
- `helpers/chat-assist.js` + `models/AIMatch.js` for AI matching failures
- `helpers/queue.js` when jobs appear stuck, missing, or prematurely cleaned up

## Commands
```bash
docker compose ps
docker compose logs -f node
docker compose exec node npm test -- tests/routes/suapRoute.test.js
docker compose exec node npm test -- tests/helpers/queue.test.js
```

## Out of scope
- Incident tooling outside this repository.
- Message brokers, worker pools, or persisted job systems that TMET does not implement.
