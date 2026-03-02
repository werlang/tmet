---
name: docker-deployment
description: Run, debug, and validate TMET in Docker Compose. Use when bringing up local services, checking container logs, executing tests in-container, or verifying Browserless integration for scraping.
---

# Docker Deployment (TMET)

## Use this skill to
- Bring up the TMET stack (`node` + `chrome`).
- Execute tests from inside the Node container.
- Diagnose startup/runtime issues with container logs.

## Compose topology
- `node`: Express app (`3000` in container, mapped to `127.0.0.1:80`)
- `chrome`: `browserless/chrome` used by scraper flows

## Standard commands
```bash
docker compose up -d --build
docker compose logs -f node
docker compose exec node npm test
docker compose exec node npm run test:coverage
docker compose down
```

## Operational checks
- Confirm both `node` and `chrome` containers are healthy.
- Confirm `.env` provides required runtime variables.
- Validate API responds through host port `80` after startup.

## Out of scope
- Kubernetes manifests, Helm charts, or multi-host deployment.
- Introducing extra sidecars not defined in `compose.yaml`.
