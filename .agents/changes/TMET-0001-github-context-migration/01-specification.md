# Specification: TMET `.github` Context Migration

**JIRA**: TMET-0001  
**Date**: 2026-03-02  
**Status**: Draft for review

## Overview
This change aligns repository guidance artifacts with the real TMET implementation. The migration replaces stale source-project documentation copied into `.github-copy/` with project-accurate guidance under `.github/`, including instructions, skills, and prompts used by coding agents.

The migration is intentionally minimal: keep only high-value artifacts that map to current TMET workflows, remove unrelated material, and rewrite all retained content so every claim is verifiable in code. The source of truth is the current repository implementation (routes, models, helpers, scripts, Docker topology, and env usage).

The migration also includes cleanup of root documentation where copied or outdated guidance could mislead contributors, especially `README.md` and duplicated prompt files.

## Functional Requirements
### Core Functionality
- Create a migration deliverable set that rewrites `.github` docs for TMET-only relevance.
- Ensure `.github/copilot-instructions.md` reflects current runtime, architecture, route map, testing, and conventions.
- Add a minimal skill catalog under `.github/skills/` with only approved, useful skills:
  - `api-development`
  - `api-unit-testing-jest`
  - `api-functional-testing`
  - `docker-deployment`
  - `web-frontend`
  - `debugging-operations`
  - existing `skill-creator`
- Remove excluded skills and all references to excluded capabilities:
  - `frontend-testing-playwright`
  - `internationalization`
  - `entity-models`
  - `refactor-feature-additions`
- Add/update `.github/prompts/` with TMET-specific prompts only:
  - `migrate-github-context.md`
  - `audit-documentation.md`
  - `api-testing-coverage.md`
- Ensure prompt and skill examples reference only real TMET paths, routes, and commands.
- Keep `.github/COMMIT.md` intact.
- Clean root-level docs for consistency, including:
  - `README.md` (fix stale scripts/routes/paths; add/modify to fit TMET reality)
  - `prompts/` cleanup to avoid duplication and stale context
- Remove `.github-copy/` after migration is complete.

### Edge Cases
- If a feature appears in copied docs but is not implemented in TMET, remove it instead of documenting as planned.
- If a command exists in docs but not in `package.json` scripts, replace with verified command.
- If route names conflict between docs and implementation, preserve only mounted routes in `server.js` and route files.
- If an env var appears in tests only, do not classify it as required runtime configuration unless production flow uses it.

## Non-Functional Requirements
- **Performance**: Documentation must remain concise and minimal; avoid unnecessary skill proliferation.
- **Security**: No secrets, credentials, or example tokens committed; env guidance remains variable-name-only.
- **Compatibility**: Guidance must match current Node/Express/Docker usage in this repo and current file layout.
- **Maintainability**: Artifacts must be easy to verify and update, with explicit file/path references and reduced duplication.

## Integration Points
- **Runtime codebase**: `server.js`, `routes/*.js`, `models/*.js`, `helpers/*.js`, `config/*.js`.
- **Operations**: `compose.yaml`, `Dockerfile`, `package.json` scripts.
- **Tests**: `__tests__/**` structure and execution commands.
- **Agent context**: `.github/copilot-instructions.md`, `.github/skills/**`, `.github/prompts/**`, `.github/COMMIT.md`.
- **Root docs**: `README.md`, `prompts/*.md`.

## Constraints and Assumptions
### Constraints
- Codebase implementation is authoritative (“code wins over docs”).
- Docker-first command examples are required.
- Only verified environment variables may be documented.
- Legacy/source-project terms and behaviors must be fully removed.
- Scope is minimal and practical; avoid adding speculative process docs.

### Assumptions
- Existing TMET architecture (single Express app + background in-memory queue + Browserless Chrome sidecar) remains unchanged during this migration.
- Existing `.github/skill-creator/` remains valid and retained.
- Users rely on `.github` artifacts for AI-agent task execution and onboarding consistency.

## Out of Scope
- Implementing new backend/frontend features.
- Adding Playwright E2E infrastructure not currently used by TMET.
- Refactoring production code solely to satisfy documentation style.
- Changing API contracts or environment behavior.

## Success Criteria
- All retained `.github` files are TMET-accurate and free of source-project residue.
- `.github/skills/README.md` matches exactly the retained skill set.
- `.github/prompts/` contains only approved TMET-specific prompts.
- `README.md` no longer references invalid scripts/routes/paths.
- Root `prompts/` no longer contains duplicated or stale migration guidance.
- Terminology sweep on `.github/**` and relevant root docs finds no legacy terms.
- `.github-copy/` is removed.

## Open Questions
- None at this stage; user decisions are complete for migration scope and strictness.
