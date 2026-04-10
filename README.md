# TMET — Timetables-Moodle Export Tool

TMET is a Node.js + Express application that generates Moodle import data from timetable and SUAP sources,
serves a static UI from `public/`, and exposes REST APIs for the same workflow.

## Architecture

### Server

- `server.js` boots Express on port `3000`
- Static UI served from `public/`
- Mounted API bases:
  - `/api/matches`
  - `/api/moodle`
  - `/api/suap`
  - `/api/ai`
  - `/api/jobs`

### Main backend folders

- `routes/` HTTP handlers
- `models/` business logic
- `helpers/` integrations/utilities (queue, scraper, uploaders)
- `config/` SUAP/Moodle/AI config
- `files/` generated and persisted artifacts

## Docker-first usage

```bash
docker compose up -d --build
docker compose logs -f node
```

Open: `http://localhost` (mapped from container `3000` to host `127.0.0.1:80`).

## Environment variables

Required:

- `SUAP_USERNAME`
- `SUAP_PASSWORD`
- `MOODLE_URL`
- `MOODLE_TOKEN`

Optional:

- `CHAT_ASSIST_API_KEY`
- `CHROME_PORT` (default `3000`)
- `MAX_CONCURRENT_JOBS` (default `1`)

## API workflow

Long-running operations are asynchronous: endpoints return `202` with `jobId`, then clients poll
`GET /api/jobs/:jobId`.

Common flow:

1. `POST /api/moodle/csv`
2. `POST /api/suap/extract`
3. `GET /api/matches`
4. `POST /api/matches`
5. `POST /api/moodle/courses`

Additional student/professor endpoints exist under `/api/suap` and `/api/moodle`.

## Generated files

- `files/moodle_classes.csv`
- `files/suap_subjects.json`
- `files/matches.json`
- `files/suap_students.json`
- `files/suap_professors.json`
- `files/moodle_students.csv`
- `files/moodle_professors.csv`

## Development and tests

NPM scripts:

- `npm run production`
- `npm run development`
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`

Docker test commands:

```bash
docker compose exec node npm test
docker compose exec node npm run test:watch
docker compose exec node npm run test:coverage
```

## AI workflow files

TMET includes repository-specific Copilot customizations under `.github/`:

- `.github/copilot-instructions.md` for always-on repository guidance
- `.github/skills/` for reusable TMET workflows
- `.github/prompts/*.prompt.md` for on-demand audit and testing tasks
- `.github/agents/tmet-docs-auditor.agent.md` for focused documentation drift audits

These files are intended to stay aligned with the current codebase, routes, tests, and Compose workflow.

## License

MIT — see `LICENSE`.
