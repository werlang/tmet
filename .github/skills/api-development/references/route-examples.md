# TMET Route Examples

Use these examples as implementation baselines. Paths are relative to mounted bases in `server.js`.

## Mounted bases
- `/api/matches`
- `/api/moodle`
- `/api/suap`
- `/api/ai`
- `/api/jobs`

## Synchronous route pattern (`routes/matches.js`)

- `GET /api/matches/`
  - Returns full matching payload from `Match#getAll()`.
- `POST /api/matches/`
  - Validates `moodleFullname` and `suapIds`/`suapId`.
  - Success: `201 { success: true }`.
  - Validation failure: `400` with explicit error message.

## Async job-start route pattern (`routes/moodle.js`, `routes/suap.js`, `routes/ai.js`)

Use this shape for long-running operations:

```json
{
  "success": true,
  "jobId": "<id>",
  "message": "... job started",
  "statusUrl": "/api/jobs/<id>"
}
```

Examples:
- `POST /api/moodle/csv`
- `POST /api/moodle/courses`
- `POST /api/suap/extract`
- `POST /api/suap/extract-students`
- `POST /api/ai/match`

## Job polling (`routes/jobs.js`)

- `GET /api/jobs/:jobId`
  - `404` when missing.
  - `200` with `{ success: true, ...job }` when present.

## Notes
- Reuse `req.app.locals.jobQueue` instead of creating per-route queues.
- Keep `statusUrl` consistent with `/api/jobs/:jobId`.
