---
name: docker-deployment
description: Run, debug, and validate TMET with Docker Compose. Use when bringing up the current node + chrome stack, checking logs, running tests in-container, or confirming Browserless-based scraping and upload workflows.
---

# Docker Deployment (TMET)

## Use this skill to
- Start the current TMET stack exactly as defined in `compose.yaml`.
- Run tests and ad hoc commands inside the `node` container.
- Verify that Browserless is available for SUAP scraping flows.

## Compose topology
- `node`
  - built from `Dockerfile`
  - working directory `/app`
  - app listens on container port `3000`
  - exposed on host `127.0.0.1:80`
- `chrome`
  - `browserless/chrome:latest`
  - used by `helpers/scraper.js`

## Standard commands
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f node
docker compose exec node npm test
docker compose exec node npm run test:coverage
docker compose down
```

## Operational checks
- Confirm `.env` contains the runtime values needed for the flow under test.
- Confirm the app responds on `http://127.0.0.1`.
- When scraping fails, verify the `chrome` service is up before changing application code.

## Out of scope
- Deployment platforms not described by `compose.yaml`.
- Extra services or sidecars that are not part of the current stack.
