# TMET — Agent Guide (AGENTS.md)

Welcome to TMET (Timetables-Moodle Export Tool). This document provides architectural context, operational guidelines, file structures, and development rules for AI coding agents working on this codebase.

---

## 1. System Overview & Tech Stack

TMET is a single Node.js Express application that coordinates timetable data extraction, SUAP scraping, subject matching (manual, automatic, or AI-assisted), and bulk Moodle CSV generation and upload.

- **Backend Runtime**: Node.js 24 (ES Modules `"type": "module"`), Express 5.
- **Browser Automation**: `playwright-core` connected to a remote `browserless/chrome` container over CDP (`http://chrome:3000`).
- **Data Persistence**: File-backed storage under `files/` (`.json` and `.csv`). No external SQL/NoSQL database.
- **Async Execution**: Shared in-memory `JobQueue` (`helpers/queue.js`). Endpoints return `202 Accepted` with a `jobId` for client status polling via `/api/jobs/:jobId`.
- **Frontend**: Static ES modules served directly from `public/` (no React, Vue, build steps, or bundlers).
- **Environment Policy**: **No local host Node/Python**. All commands, tests, and runtime processes must be executed inside Docker containers (`docker compose exec node ...`).

---

## 2. Directory Architecture & Sitemap

```
├── server.js               # Application entrypoint & Express routing setup
├── compose.yaml            # Docker Compose configuration (node + chrome services)
├── Dockerfile              # Container definition for node runtime (Alpine base)
├── package.json            # App dependencies (Express 5, playwright-core, Jest)
│
├── routes/                 # Express HTTP handlers & async job starters
│   ├── moodle.js           # Timetable extraction, course creation, CSV generation
│   ├── suap.js             # SUAP subject & student/professor extraction jobs
│   ├── matches.js          # Subject matching CRUD & persistence
│   ├── ai.js               # AI-powered subject matching endpoint
│   └── jobs.js             # Async job status polling (/api/jobs/:jobId)
│
├── models/                 # File-backed domain models & business logic
│   ├── Moodle.js           # EduPage timetables, manual courses, CSV builders
│   ├── SUAP.js             # SUAP subject/student/professor data extraction
│   ├── Match.js            # Subject matching storage and lookup
│   └── AIMatch.js          # LLM prompt construction & suggestion parsing
│
├── helpers/                # Infrastructure, scrapers, and external clients
│   ├── scraper.js          # Playwright-based SUAP web scraper (CDP connection)
│   ├── timetables.js       # EduPage timetable client
│   ├── moodle-uploader.js  # Moodle browserless uploader client
│   ├── chat-assist.js      # AI provider API integration helper
│   ├── queue.js            # Shared in-memory job queue manager
│   ├── request.js          # Backend HTTP client utility
│   └── request-window.js   # Rate-limiting / window helper
│
├── config/                 # Static & dynamic selector configurations
│   ├── suap-config.js      # SUAP URL paths, course codes, and scraping configs
│   ├── suap-selectors.js   # Built-in SUAP DOM selectors with optional JSON override support
│   ├── moodle-config.js    # Moodle URLs and field mappings
│   └── chat-assist.js      # AI provider configuration
│
├── public/                 # Static frontend served by Express
│   ├── index.html          # Single-page UI shell
│   ├── css/                # Vanilla CSS stylesheets
│   └── js/                 # Browser ES modules (app.js, sections/, models/)
│
├── files/                  # Workflow state & generated CSV/JSON artifacts
│
├── tests/                  # Jest + Supertest test suite
│   ├── routes/             # Route contract tests
│   ├── models/             # Domain model unit tests
│   ├── helpers/            # Integration & helper unit tests
│   ├── integration/        # End-to-end pipeline tests
│   ├── setup.js            # Test environment configuration
│   └── fixtures.js         # Shared mock datasets
│
└── .agents/                # Agent skills & prompt templates
    ├── skills/             # TMET agent skills
    └── prompts/            # On-demand agent prompt templates
```

---

## 3. Operational & Development Commands

Always run commands through Docker Compose:

```bash
# Build and bring up the container stack
docker compose up -d --build

# View real-time container logs
docker compose logs -f node

# Run unit and integration tests (default automated validation)
docker compose exec node npm test

# Run a specific test suite
docker compose exec node npm test -- tests/routes/suapRoute.test.js

# Run test coverage
docker compose exec node npm test:coverage
```

---

## 4. Key Engineering Invariants & Rules

1. **Host Environment Constraint**: Never run `npm` or `node` directly on the host machine. Always use `docker compose exec node ...`.
2. **ES Modules Only**: Use native ESM `import` and `export`. Do not use `require()` or CommonJS syntax.
3. **Thin Route Handlers**: Route modules in `routes/` should only validate HTTP request parameters, queue background jobs, or call model methods, returning standardized JSON responses.
4. **File-Backed Persistence**: Workflow data lives in `files/*.json` and `files/*.csv`. Respect existing file formats and schema structures when adding fields.
5. **Browser Automation**: Use `playwright-core` connected to the `chrome` container via `chromium.connectOverCDP('http://chrome:3000')`. Do not install browser binaries locally.
6. **No Spurious Dependencies**: Do not introduce frontend bundlers, database ORMs, or message brokers. Keep the stack lightweight.

---

## 5. Agent Skills & Prompts Index (`.agents/`)

### Skills (`.agents/skills/`)
- [`api-development`](.agents/skills/api-development/): Express handlers, file-backed models, async jobs, and integrations.
- [`api-unit-testing-jest`](.agents/skills/api-unit-testing-jest/): Writing Jest + Supertest unit tests under `tests/`.
- [`api-functional-testing`](.agents/skills/api-functional-testing/): Validating multi-step flows, job polling, and artifacts.
- [`pipeline-workflow`](.agents/skills/pipeline-workflow/): EduPage extraction, SUAP scraping, matching, and Moodle CSV pipeline.
- [`web-frontend`](.agents/skills/web-frontend/): Maintaining the static frontend in `public/`.
- [`docker-deployment`](.agents/skills/docker-deployment/): Operating and troubleshooting the Docker Compose stack.
- [`debugging-operations`](.agents/skills/debugging-operations/): Triaging queue, scraper, API, and artifact issues.

### Prompts (`.agents/prompts/`)
- [`api-testing-coverage`](.agents/prompts/api-testing-coverage.prompt.md): Prompt for increasing backend test coverage.
- [`audit-documentation`](.agents/prompts/audit-documentation.prompt.md): Prompt for auditing markdown documentation against implementation.
- [`migrate-github-context`](.agents/prompts/migrate-github-context.prompt.md): Prompt for migrating context between locations.
