# READ BEFORE ANY TASK — TMET `.github` Context Migration

**JIRA**: TMET-0001  
**Date**: 2026-03-02  
**Status**: Active

## Mission
Migrate copied `.github` context into TMET-accurate agent documentation with **zero stale source-project claims**.

## Required Context Load Order
1. Read [00.jira-request.txt](00.jira-request.txt)
2. Read [01-specification.md](01-specification.md)
3. Read [02-plan.md](02-plan.md)
4. Read this file fully before editing anything

## Non-Negotiable Rules
- **Code is truth**: verify every claim against implementation (`server.js`, `routes/*.js`, `models/*.js`, `helpers/*.js`, `config/*.js`, `compose.yaml`, `package.json`).
- **Current behavior only**: no aspirational or planned features stated as facts.
- **Minimal footprint**: keep only approved, useful skills/prompts.
- **Docker-first commands**: prefer `docker compose ...` examples in docs.
- **Verified env vars only**:
  - Required: `SUAP_USERNAME`, `SUAP_PASSWORD`, `MOODLE_URL`, `MOODLE_TOKEN`
  - Optional: `CHAT_ASSIST_API_KEY`, `CHROME_PORT`, `MAX_CONCURRENT_JOBS`
- **Legacy removal**: remove TrocaAula/source residue (e.g., proposals/cards/Redis/compose.dev.yaml/Playwright sidecar assumptions).
- **Keep** `.github/COMMIT.md` unchanged.

## Approved `.github` Skills (and only these)
- `api-development`
- `api-unit-testing-jest`
- `api-functional-testing`
- `docker-deployment`
- `web-frontend`
- `debugging-operations`
- `skill-creator` (existing)

## Excluded Skills
- `frontend-testing-playwright`
- `internationalization`
- `entity-models`
- `refactor-feature-additions`

## Approved `.github/prompts`
- `migrate-github-context.md`
- `audit-documentation.md`
- `api-testing-coverage.md`

## Route Truth Source
Mounted API bases in `server.js`:
- `/api/matches`
- `/api/moodle`
- `/api/suap`
- `/api/ai`
- `/api/jobs`

Use `routes/*.js` to document concrete method/path contracts.

## Execution Hygiene
- Work task-by-task; keep diffs focused.
- If a file/path mentioned in docs does not exist, remove or replace with real path.
- After each task, run a targeted grep sweep for stale terms in changed files.
- Do not introduce runtime code changes unless strictly needed for documentation correctness checks.

## Task Status Tracking
Use `PROGRESS.md` in this change folder with columns:
- Task
- Status (`⬜ Not Started` / `🔄 In Progress` / `✅ Completed`)
- Owner
- Notes

Create/update `PROGRESS.md` in Task 1 if missing.

## Done Definition (Global)
- All docs under `.github` and selected root docs are TMET-accurate.
- No stale source-project residue in retained documentation.
- `.github-copy/` removed.
- Final artifacts generated: `04-commit-msg.md` and `05-gitlab-mr.md`.
