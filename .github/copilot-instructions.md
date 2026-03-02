# TMET Copilot Instructions

## Project Overview
TMET (Timetables-Moodle Export Tool) is a Node.js + Express application that builds Moodle import data from timetable/SUAP sources and provides both a REST API and a static web UI from `public/`.

## Architecture

### Server structure
```
server.js         # Express app bootstrap, static hosting, API route mounts

routes/           # HTTP API handlers
  matches.js      # Manual/auto match retrieval and creation
  moodle.js       # Moodle CSV generation and Moodle upload jobs
  suap.js         # SUAP extraction and retrieved data endpoints
  ai.js           # AI-assisted matching job endpoint
  jobs.js         # Job polling endpoint

models/           # Business logic
  Moodle.js
  SUAP.js
  Match.js
  AIMatch.js

helpers/          # Integration/utilities
  queue.js        # In-memory async queue (shared across routes)
  timetables.js   # Timetable fetch helper
  scraper.js      # Browserless/Puppeteer SUAP scraping
  moodle-uploader.js
  chat-assist.js
```

### Client structure
```
public/
  index.html
  js/app.js
  js/sections/    # pipeline, matching, students UI flows
  js/components/
  js/models/
  js/helpers/
```

### Async job queue pattern
- Long-running operations queue work via `req.app.locals.jobQueue.queue(...)`.
- Job-start endpoints return `202` with `{ jobId, statusUrl }`.
- Clients poll `GET /api/jobs/:jobId` until completion/failure.

## API Contracts

### Mounted route bases (`server.js`)
- `/api/matches`
- `/api/moodle`
- `/api/suap`
- `/api/ai`
- `/api/jobs`

### Implemented route handlers (`routes/*.js`)
| Method | Path |
|---|---|
| GET | `/api/matches` |
| POST | `/api/matches` |
| POST | `/api/moodle/csv` |
| POST | `/api/moodle/courses` |
| POST | `/api/moodle/students-csv` |
| POST | `/api/moodle/professors-csv` |
| POST | `/api/moodle/students` |
| POST | `/api/moodle/professors` |
| GET | `/api/suap/students` |
| POST | `/api/suap/extract` |
| GET | `/api/suap/subjects/:id/students` |
| POST | `/api/suap/extract-students` |
| GET | `/api/suap/professors` |
| POST | `/api/suap/extract-professors` |
| POST | `/api/ai/match` |
| GET | `/api/jobs/:jobId` |

## Docker-First Workflow
```bash
docker compose up -d --build
docker compose logs -f node
docker compose exec node npm test
docker compose exec node npm run test:watch
docker compose exec node npm run test:coverage
```

`compose.yaml` defines two services: `node` (app on container `3000`, mapped to host `127.0.0.1:80`) and `chrome` (`browserless/chrome`).

## Environment Variables

### Required
- `SUAP_USERNAME`
- `SUAP_PASSWORD`
- `MOODLE_URL`
- `MOODLE_TOKEN`

### Optional
- `CHAT_ASSIST_API_KEY`
- `CHROME_PORT` (defaults to `3000`)
- `MAX_CONCURRENT_JOBS` (defaults to `1`)

## Testing and Conventions
- Test stack: Jest + Supertest (`__tests__/` mirrors helpers/models/routes/integration).
- Package scripts: `production`, `development`, `test`, `test:watch`, `test:coverage`.
- Use ES modules (`import`/`export`) and async/await.
- Keep route handlers thin; put business logic in `models/` and reusable operations in `helpers/`.
- For scraping, connect through Browserless (`chrome` service) instead of launching a local browser.
