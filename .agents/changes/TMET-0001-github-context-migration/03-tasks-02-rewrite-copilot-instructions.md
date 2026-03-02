# Task 2: Rewrite `.github/copilot-instructions.md`

## INSPECTOR FEEDBACK

### Verdict
✅ Completed (Re-inspection)

### Re-inspection outcome
Previous blocking issue is resolved. The extra **Implemented route handlers (`routes/*.js`)** section was removed, and API contracts now list mounted route bases only.

### Primary validation evidence
1. Mounted endpoints in `server.js` are only:
  - `/api/matches`
  - `/api/moodle`
  - `/api/suap`
  - `/api/ai`
  - `/api/jobs`
2. `.github/copilot-instructions.md` API Contracts section includes only mounted route bases (`server.js`) ✅
3. Other acceptance checks pass:
  - Docker/test commands match `compose.yaml` and `package.json` scripts
  - Env vars listed are verified in code only
  - Stale-term grep returns no matches in `.github/copilot-instructions.md`

### Resolution status
- No further fix required for Task 02.

### Evidence commands
- `grep -n "app.use('/api/" server.js`
- `grep -REn "router\.(get|post|put|patch|delete)\(" routes/*.js`
- `grep -RhoE "process\.env\.[A-Z0-9_]+" config helpers models routes server.js | sort -u`
- `grep -nEi 'TrocaAula|Redis|Playwright|proposals|cards|compose\.dev|frontend-testing-playwright|internationalization|entity-models|refactor-feature-additions' .github/copilot-instructions.md`

**Depends on**: Task 1  
**Estimated complexity**: Medium  
**Type**: Documentation

## Objective
Replace existing instructions with a concise TMET-accurate guide reflecting current architecture, routes, scripts, testing, and environment variables.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.github/copilot-instructions.md`
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Rewrite `.github/copilot-instructions.md` using only verified TMET facts from source code.
3. Ensure sections include:
   - project overview and architecture
   - server/client structure
   - async job queue pattern and `/api/jobs/:id` polling
   - route list for mounted endpoints only
   - Docker-first workflow and test commands
   - required vs optional env vars (verified only)
4. Remove all legacy source-project terms and non-existent systems.
5. Keep guidance actionable and minimal; avoid speculative behavior.
6. Run stale-term grep on `.github/copilot-instructions.md`.
7. Update `PROGRESS.md` to mark this task as ✅ Completed.
8. Commit with a conventional commit message: `docs(context): align copilot instructions with TMET runtime`

## Acceptance Criteria
- [ ] Instructions match current file layout and route contracts
- [ ] Docker commands correspond to existing compose/scripts
- [ ] Env var section contains only verified vars
- [ ] No legacy terminology remains
- [ ] Documentation updated

## Testing
- **Test file**: N/A
- **Test cases**:
  - Manual check against `server.js`, `routes/*.js`, `package.json`, `compose.yaml`

## Notes
This is the highest-priority context file; downstream skills/prompts should align with its terminology.
