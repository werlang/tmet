---
name: api-development
description: Build and update TMET backend APIs in Express. Use when changing handlers in routes/*.js, file-backed business logic in models/*.js, queue-driven async jobs, scraping/upload integrations in helpers/*.js, or response contracts under /api/matches, /api/moodle, /api/suap, /api/ai, and /api/jobs.
---

# API Development (TMET)

## Use this skill to
- Add or refine HTTP handlers in `routes/*.js`.
- Keep file-backed workflow logic in `models/*.js`.
- Reuse the shared async queue and polling pattern instead of creating ad hoc background flows.
- Update integrations that touch EduPage, SUAP, Browserless, AI matching, or Moodle uploads.

## Key files
- `server.js`
- `routes/matches.js`
- `routes/moodle.js`
- `routes/suap.js`
- `routes/ai.js`
- `routes/jobs.js`
- `models/Match.js`
- `models/Moodle.js`
- `models/SUAP.js`
- `models/AIMatch.js`
- `helpers/queue.js`
- `helpers/timetables.js`
- `helpers/scraper.js`
- `helpers/moodle-uploader.js`
- `helpers/chat-assist.js`
- `files/`

## Workflow
1. Confirm the mounted route base in `server.js` and the existing JSON response shape in the touched route file.
2. Keep synchronous routes simple and push reusable logic into the model/helper layer.
3. For long-running work, queue through `req.app.locals.jobQueue.queue(...)` and return `202` with `success`, `jobId`, `message`, and `statusUrl`.
4. Treat `files/*.json` and `files/*.csv` as part of the product workflow, not disposable temp output.
5. Update focused tests in `tests/routes`, `tests/models`, `tests/helpers`, or `tests/integration`.

## Docker-first commands
```bash
docker compose up -d --build
docker compose logs -f node
docker compose exec node npm test -- tests/routes/moodleRoute.test.js
```

## References
- Read [route examples](./references/route-examples.md) for current route patterns and artifact-producing flows.

## Out of scope
- Adding infrastructure that does not exist in this repository.
- Assuming persisted jobs, a database layer, or a frontend framework.
