# TMET Copilot Instructions

## Project Overview
TMET is a single Node.js + Express application that serves a static frontend from `public/` and exposes REST APIs from `server.js`. Its core workflow is:

1. extract timetable data from EduPage,
2. extract subjects and people from SUAP,
3. match Moodle and SUAP subjects manually, automatically, or with AI assistance,
4. generate Moodle CSV artifacts,
5. optionally upload courses, students, and professors to Moodle.

## Architecture

### Runtime shape
- `server.js` creates one shared `JobQueue`, serves `public/`, and mounts:
  - `/api/matches`
  - `/api/moodle`
  - `/api/suap`
  - `/api/ai`
  - `/api/jobs`
- `routes/` owns HTTP orchestration and async job startup/polling.
- `models/` owns file-backed domain behavior:
  - `Match.js`
  - `Moodle.js`
  - `SUAP.js`
  - `AIMatch.js`
- `helpers/` owns infrastructure and integrations:
  - `queue.js`
  - `timetables.js`
  - `scraper.js`
  - `moodle-uploader.js`
  - `chat-assist.js`
  - `request.js`
  - `request-window.js`

### Frontend shape
- `public/index.html` is the main UI shell.
- `public/js/app.js` is the coordinator that caches DOM references and wires sections.
- `public/js/sections/` contains the main feature controllers:
  - `pipeline.js`
  - `matching.js`
  - `students.js`
- `public/js/components/`, `public/js/models/`, and `public/js/helpers/` support the static UI.
- The frontend uses browser-native ES modules. There is no React/Vue app or frontend build pipeline to preserve.

### File-backed workflow artifacts
Treat `files/` as part of the real application workflow. The most important generated artifacts are:
- `files/moodle_classes.csv`
- `files/moodle_manual_classes.csv`
- `files/suap_subjects.json`
- `files/matches.json`
- `files/suap_students.json`
- `files/suap_professors.json`
- `files/moodle_students.csv`
- `files/moodle_manual_students.csv`
- `files/moodle_professors.csv`

## Async Job Pattern
- Long-running operations queue work through `req.app.locals.jobQueue.queue(...)`.
- Job-start routes return `202` with `success`, `jobId`, `message`, and `statusUrl`.
- Clients poll `GET /api/jobs/:jobId`.
- The queue is in-memory and jobs are not durable across restarts.

## Integration Facts
- EduPage timetable extraction lives in `helpers/timetables.js`.
- SUAP browser automation goes through Browserless via `helpers/scraper.js` and the `chrome` Compose service.
- AI matching is optional and uses `helpers/chat-assist.js` plus `models/AIMatch.js`.
- Missing AI configuration should be treated as a real configuration problem, not silently bypassed.

## Docker-First Workflow
```bash
docker compose up -d --build
docker compose logs -f node
docker compose exec node npm test
docker compose exec node npm run test:coverage
```

`compose.yaml` currently defines:
- `node`: Express app on container port `3000`, exposed on host `127.0.0.1:80`
- `chrome`: `browserless/chrome` for scraping flows

## Environment Variables

### Required for the full extraction/upload workflow
- `SUAP_USERNAME`
- `SUAP_PASSWORD`
- `MOODLE_URL`
- `MOODLE_TOKEN`

### Optional
- `CHAT_ASSIST_API_KEY`
- `CHROME_PORT`
- `MAX_CONCURRENT_JOBS`
- `NODE_ENV`

## Conventions
- Use ES modules and async/await.
- Keep route handlers thin; move reusable logic to `models/` or `helpers/`.
- Preserve the existing `success` / `error` JSON style already used inside each route module.
- For async work, reuse the shared queue pattern instead of inventing a second background-execution mechanism.
- For frontend work, keep HTTP calls in `public/js/models/*.js` or `public/js/helpers/request.js`, not scattered across DOM event handlers.
- Do not document or assume infrastructure that does not exist here: no database, no worker service, no frontend framework, no persisted jobs.

## Testing
- Jest + Supertest coverage lives under `tests/`:
  - `tests/routes`
  - `tests/models`
  - `tests/helpers`
  - `tests/integration`
  - `tests/setup.js`
  - `tests/fixtures.js`
- For route and model work, follow the existing ESM mocking patterns already used in the suite.
- For docs or AI customization changes, validate claims against `server.js`, `routes/`, `models/`, `helpers/`, `package.json`, and `compose.yaml`.

## AI Workflow Files
- `.github/skills/` stores TMET-specific reusable workflows.
- `.github/prompts/*.prompt.md` stores reusable on-demand tasks.
- `.github/agents/` stores focused custom agents for recurring maintenance work.
- Keep these files tightly scoped to verified TMET behavior and current customization conventions.
