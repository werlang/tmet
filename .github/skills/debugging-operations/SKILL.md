---
name: debugging-operations
description: Diagnose TMET runtime, API, queue, and scraping/upload operational issues. Use when investigating failing routes, stuck jobs, Docker/container problems, malformed output files, or test regressions.
---

# Debugging and Operations (TMET)

## Use this skill to
- Triage API failures in `routes/`, `models/`, and `helpers/`.
- Investigate queue job lifecycle issues (`helpers/queue.js`, `/api/jobs/:jobId`).
- Diagnose scraper/upload problems involving Browserless and external endpoints.

## Fast triage flow
1. Reproduce with the smallest command or API call.
2. Check `docker compose logs -f node` and route/model stack traces.
3. Confirm queue state through `/api/jobs/:jobId` behavior.
4. Validate required env vars are present and consistent.
5. Add/adjust tests to lock the fix.

## Docker-first commands
```bash
docker compose ps
docker compose logs -f node
docker compose exec node npm test
docker compose exec node node server.js
```

## Common hotspots
- `helpers/scraper.js` + `config/suap-config.js` for SUAP extraction issues.
- `helpers/moodle-uploader.js` + `config/moodle-config.js` for Moodle upload failures.
- `helpers/queue.js` when job status/progress appears inconsistent.

## Out of scope
- Incident tooling external to this repo.
- Debug assumptions about message brokers or worker pools not implemented in TMET.
