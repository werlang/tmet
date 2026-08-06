# TMET Agent Skills

This directory contains TMET-specific agent skills. They describe real workflows in this codebase.

## Approved Skills

| Skill | Purpose |
|---|---|
| [api-development](api-development/) | Change Express routes, file-backed models, queue-driven jobs, and backend integrations |
| [api-unit-testing-jest](api-unit-testing-jest/) | Add or update Jest + Supertest coverage under `tests/` |
| [api-functional-testing](api-functional-testing/) | Validate async route flows, polling contracts, generated artifacts, and cross-module behavior |
| [pipeline-workflow](pipeline-workflow/) | Work across the extraction -> matching -> CSV -> Moodle upload pipeline and its generated files |
| [web-frontend](web-frontend/) | Update the static frontend in `public/` without introducing framework/build assumptions |
| [docker-deployment](docker-deployment/) | Run and troubleshoot the current Compose stack (`node` + `chrome`) |
| [debugging-operations](debugging-operations/) | Investigate queue, scraping, upload, API, and file-artifact failures |

## Notes

- TMET is a single Express app, not a split API/web monorepo.
- The test suite lives in `tests/`, not `__tests__/`.
- The frontend is static and served from `public/`; there is no web bundler workflow to document or preserve.
- Prompt templates live in `.agents/prompts/*.prompt.md`.
- Custom documentation auditor agent lives in `.github/agents/tmet-docs-auditor.agent.md`.
