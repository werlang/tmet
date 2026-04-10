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

## File-backed management routes

- `GET /api/moodle/manual-courses`
  - Returns `{ success: true, courses }` from `Moodle#getManualCourses()`.
- `POST /api/moodle/manual-courses`
  - Creates one manual Moodle course entry that later feeds `moodle_manual_classes.csv`.
- `POST /api/moodle/manual-courses/remove`
  - Removes one queued manual course by `fullname`.
- `POST /api/suap/manual-student`
  - Stores a manual enrollment entry inside `suap_students.json`.
- `POST /api/suap/manual-student/remove`
  - Removes one queued manual student by enrollment.

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
- `POST /api/moodle/manual-courses-csv`
- `POST /api/moodle/courses`
- `POST /api/moodle/students-csv`
- `POST /api/moodle/manual-students-csv`
- `POST /api/moodle/professors-csv`
- `POST /api/moodle/students`
- `POST /api/moodle/professors`
- `POST /api/suap/extract`
- `POST /api/suap/extract-students`
- `POST /api/suap/extract-professors`
- `POST /api/ai/match`

## Job polling (`routes/jobs.js`)

- `GET /api/jobs/:jobId`
  - `404` when missing.
  - `200` with `{ success: true, ...job }` when present.

## Notes
- Reuse `req.app.locals.jobQueue` instead of creating per-route queues.
- Keep `statusUrl` consistent with `/api/jobs/:jobId`.
- When a route writes or depends on workflow artifacts, keep the file names stable and documented:
  - `files/moodle_classes.csv`
  - `files/moodle_manual_classes.csv`
  - `files/suap_subjects.json`
  - `files/matches.json`
  - `files/suap_students.json`
  - `files/suap_professors.json`
  - `files/moodle_students.csv`
  - `files/moodle_manual_students.csv`
  - `files/moodle_professors.csv`
