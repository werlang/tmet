# Discrepancy Ledger — TMET-0001 Baseline

Date: 2026-03-02  
Task: 01 — Bootstrap Progress and Baseline Inventory

## 1) Baseline Inventory (Current State)

### `.github/**` (active)
- `.github/COMMIT.md`
- `.github/copilot-instructions.md`
- `.github/skills/skill-creator/SKILL.md`
- `.github/prompts/` directory is currently missing

### Root docs in migration scope
- `README.md`
- `prompts/migrate-github-context.md`

### Legacy copied context present (`.github-copy/**`)
- `.github-copy/copilot-instructions.md`
- `.github-copy/skills/README.md`
- `.github-copy/skills/*` (11 skill directories, including excluded ones)
- `.github-copy/prompts/*` (4 prompts, including excluded Playwright prompt)

## 2) Discrepancy Ledger (Old claim -> actual TMET behavior)

| Old claim (stale/inaccurate) | Actual TMET behavior (verified) | File(s) needing fix |
|---|---|---|
| CLI/docs use `modules/*.js` workflows and folder structure | Runtime code uses `models/`, `routes/`, `helpers/`; no `modules/` folder exists | `README.md` |
| API endpoints documented as `/api/generate-csv`, `/api/extract-suap`, `/api/data`, `/api/match`, `/api/upload-courses` | Mounted API bases are `/api/matches`, `/api/moodle`, `/api/suap`, `/api/ai`, `/api/jobs`; concrete handlers live in `routes/*.js` | `README.md` |
| `npm run ui` script documented | `package.json` scripts are `production`, `development`, `test`, `test:watch`, `test:coverage`; no `ui` script | `README.md` |
| Output file documented as `files/manual_matches.json` | Match persistence file is `files/matches.json` | `README.md` |
| Dev topology documented as separate `web` and `node` app services | `compose.yaml` currently defines `node` (serves app on host 80->3000) and `chrome` only | `README.md` |
| `.github-copy` docs describe TrocaAula domain, proposal/card routes, Redis cache, Playwright sidecar, `compose.dev.yaml` | TMET runtime is Moodle/SUAP/EduPage flow with Express API + in-memory queue + Browserless Chrome sidecar | `.github-copy/copilot-instructions.md`, `.github-copy/skills/**`, `.github-copy/prompts/**` |
| `.github-copy/skills` contains excluded skills (`frontend-testing-playwright`, `internationalization`, `entity-models`, `refactor-feature-additions`) | Approved minimal retained set is defined in task spec/read-before and excludes these | `.github-copy/skills/README.md`, `.github-copy/skills/*` |
| `.github-copy/prompts` contains `frontend-testing-playwright-coverage.md` | Approved prompt set excludes this prompt | `.github-copy/prompts/frontend-testing-playwright-coverage.md` |

## 3) Files to Delete (migration cleanup targets)

### Entire legacy copy tree
- `.github-copy/**`

### Excluded artifacts to ensure absent in final `.github` state
- `.github/skills/frontend-testing-playwright/**`
- `.github/skills/internationalization/**`
- `.github/skills/entity-models/**`
- `.github/skills/refactor-feature-additions/**`
- `.github/prompts/frontend-testing-playwright-coverage.md`

## 4) Stale-Term Baseline Sweep (summary counts)

Baseline grep terms: `TrocaAula`, `Redis`, `Playwright`, `proposals|cards|compose.dev`.

### Primary hotspot (`.github-copy/**/*.md`)
- `TrocaAula`: 7 matches
- `Redis`: 33 matches
- `Playwright`: 43 matches
- `proposals|cards|compose.dev`: 119 matches

Notes:
- Counts are baseline line-match counts from repository grep and are sufficient to track reduction trend in later tasks.
- `proposals|cards|compose.dev` is broad and expected to over-count in copied legacy docs.

### Active root prompt (`prompts/migrate-github-context.md`)
- Contains generic migration examples mentioning `Redis` (contextual, not runtime claim).

## 5) File Path Validation (ledger references)

All path references in this ledger were validated as existing at inventory time using repository listing/read checks:
- `README.md`
- `server.js`
- `package.json`
- `compose.yaml`
- `routes/moodle.js`
- `routes/suap.js`
- `routes/matches.js`
- `routes/ai.js`
- `routes/jobs.js`
- `.github/copilot-instructions.md`
- `.github/skills/skill-creator/SKILL.md`
- `.github-copy/copilot-instructions.md`
- `.github-copy/skills/README.md`
- `.github-copy/prompts/migrate-github-context.md`

Outcome: baseline inventory and mismatch checklist are ready for Tasks 02–06.