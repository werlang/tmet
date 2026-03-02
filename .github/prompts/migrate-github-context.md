# TMET .github Context Migration Prompt

Migrate copied `.github` guidance into TMET-accurate agent context with zero stale claims.

## Objective

Rewrite `.github` documentation so every statement is verifiable against this repository.

## Scope

Update and validate:

1. `.github/copilot-instructions.md`
2. `.github/skills/README.md`
3. `.github/skills/*/SKILL.md`
4. `.github/skills/*/references/*.md`
5. `.github/prompts/*.md`

Also audit root docs when stale: `README.md`, `prompts/*.md`.

## TMET Source of Truth

- Runtime and route mounts: `server.js`
- API contracts: `routes/*.js`
- Business logic: `models/*.js`
- Integrations/helpers: `helpers/*.js`, `config/*.js`
- Ops and scripts: `compose.yaml`, `Dockerfile`, `package.json`

## Hard Rules

1. Code wins over docs.
2. Document only implemented behavior.
3. Prefer Docker-first commands.
4. Keep only approved TMET skills and prompts.
5. Remove stale source-project terms and unsupported architecture assumptions from copied docs.
6. Keep `.github/COMMIT.md` unchanged.

## Verified TMET Runtime Facts

- Mounted API bases in `server.js`:
  - `/api/matches`
  - `/api/moodle`
  - `/api/suap`
  - `/api/ai`
  - `/api/jobs`
- Required env vars:
  - `SUAP_USERNAME`, `SUAP_PASSWORD`, `MOODLE_URL`, `MOODLE_TOKEN`
- Optional env vars:
  - `CHAT_ASSIST_API_KEY`, `CHROME_PORT`, `MAX_CONCURRENT_JOBS`
- Docker workflow:
  - `docker compose up -d --build`
  - `docker compose logs -f node`
  - `docker compose exec node npm test`

## Workflow

1. Inventory current `.github` docs and list mismatches.
2. Rewrite files in small, focused diffs.
3. Validate routes/scripts/env vars against TMET code.
4. Run stale-term sweeps in changed files.
5. Report completed changes and remaining code gaps.

## Required Output

```markdown
## TMET Context Migration Summary

### Files Changed
- [path] - short reason

### Mismatches Fixed
- Fixed: <old claim> -> <code-verified TMET fact>
- Removed: <stale concept>

### Validation Checks
- Route mounts check: pass/fail + command
- Env var check: pass/fail + command
- Stale-term sweep: pass/fail + command

### Remaining Gaps (Code, not docs)
- <item or "None">
```

## One-line Invocation

Use this prompt to rewrite copied `.github` context so it matches TMET code truth, remove stale source-project residue, and return a mismatch-and-validation report.
