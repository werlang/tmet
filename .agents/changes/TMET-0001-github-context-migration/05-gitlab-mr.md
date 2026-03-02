# TMET-0001 — GitHub Context Migration

## Context
TMET inherited copied `.github` guidance that referenced non-TMET systems and stale workflows.
This migration replaces that context with repository-accurate instructions, skills, and prompts
so contributors and coding agents can execute tasks against the real implementation.

## Changes
- Rewrote `.github/copilot-instructions.md` from code truth (routes, scripts, env, Docker).
- Reduced `.github/skills` to the approved minimal TMET skill set and removed excluded skills.
- Rebuilt `.github/prompts` with the approved TMET-only prompt suite.
- Cleaned root docs to remove stale guidance and eliminated duplicated root migration prompts.
- Ran final validation sweeps and removed `.github-copy/` migration residue.
- Added release artifacts for handoff: `04-commit-msg.md` and this MR description.

## Usage
- Use `.github/copilot-instructions.md` as the canonical agent behavior and repo context source.
- Use retained `.github/skills/*` to scope implementation/testing/debugging tasks in TMET.
- Use `.github/prompts/*.md` for migration/audit/coverage workflows aligned to current code.
- Use Docker-first commands from docs for local validation and CI-consistent execution.

## Impact
- Improves onboarding and agent reliability by removing stale terms and invalid assumptions.
- Reduces documentation drift risk by narrowing to approved, maintainable guidance artifacts.
- Increases confidence that documented routes, scripts, ports, paths, and env vars match code.
- Enables cleaner future reviews with explicit TMET-focused context and release summaries.

## Examples
- API tasking now maps to mounted bases in `server.js`: `/api/matches`, `/api/moodle`,
  `/api/suap`, `/api/ai`, `/api/jobs`.
- Runtime configuration docs now distinguish required vars (`SUAP_USERNAME`,
  `SUAP_PASSWORD`, `MOODLE_URL`, `MOODLE_TOKEN`) from optional vars
  (`CHAT_ASSIST_API_KEY`, `CHROME_PORT`, `MAX_CONCURRENT_JOBS`).
- Contributor commands now prioritize Docker-first flows (`docker compose up -d --build`,
  `docker compose exec node npm test`) aligned with repository operations.

Refs: TMET-0001
