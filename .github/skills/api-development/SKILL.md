---
name: api-development
description: Build or modify TMET backend APIs in Express. Use when changing handlers in routes/*.js, business rules in models/*.js, or integrations/helpers used by mounted endpoints under /api/matches, /api/moodle, /api/suap, /api/ai, and /api/jobs.
---

# API Development (TMET)

## Use this skill to
- Add or update HTTP handlers in `routes/*.js`.
- Move non-trivial logic into `models/*.js` or reusable code into `helpers/*.js`.
- Keep async-job endpoints aligned with queue polling in `routes/jobs.js`.

## Key files
- `server.js` (mounted API bases and shared queue)
- `routes/` (`matches.js`, `moodle.js`, `suap.js`, `ai.js`, `jobs.js`)
- `models/` (`Match.js`, `Moodle.js`, `SUAP.js`, `AIMatch.js`)
- `helpers/` (`queue.js`, `scraper.js`, `moodle-uploader.js`, `timetables.js`)
- `config/` (`suap-config.js`, `moodle-config.js`, `chat-assist.js`)

## Workflow
1. Confirm mounted base path in `server.js`.
2. Implement/adjust route handler with request validation and clear status codes.
3. Keep route handlers thin; call model/helper methods for domain logic.
4. For long-running work, queue via `req.app.locals.jobQueue.queue(...)` and return `202` with `jobId` and `statusUrl`.
5. Add or update focused tests in `__tests__/routes` and/or `__tests__/models`.

## Docker-first commands
```bash
docker compose up -d --build
docker compose logs -f node
docker compose exec node npm test
```

## References
- Read `references/route-examples.md` for real route and response patterns.

## Out of scope
- Adding non-existent services or sidecars that are not defined in this repository.
- Documenting aspirational endpoints not mounted in `server.js`.
