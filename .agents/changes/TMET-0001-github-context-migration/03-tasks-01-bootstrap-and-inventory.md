# Task 1: Bootstrap Progress and Baseline Inventory

## INSPECTOR FEEDBACK

### Verdict
✅ Complete

### Inspector Note
Rework verified complete. Prior reproducibility gap is resolved and acceptance checks now pass.

### Resolution Evidence
1. **Stale-term baseline counts are reproducible**
  - `06-discrepancy-ledger.md` reports (scope: `.github-copy/**/*.md`):
    - `TrocaAula`: 7
    - `Redis`: 18
    - `Playwright`: 24
    - `proposals|cards|compose.dev`: 51
  - Fresh reproducibility check at current HEAD returns the same values.

2. **Command provenance is documented**
  - Ledger includes deterministic grep commands used for each count.

3. **Scope remains explicit and unchanged**
  - Ledger states scope as `.github-copy/**/*.md` only.

### Evidence Commands (repro)
- `grep -RIn --include='*.md' 'TrocaAula' .github-copy | wc -l`
- `grep -RIn --include='*.md' 'Redis' .github-copy | wc -l`
- `grep -RIn --include='*.md' 'Playwright' .github-copy | wc -l`
- `grep -REIn --include='*.md' 'proposals|cards|compose\.dev' .github-copy | wc -l`

### Acceptance Confirmation
- `PROGRESS.md` exists with task tracking rows.
- `06-discrepancy-ledger.md` exists with actionable mismatches.
- Baseline stale-term sweep summary is captured and reproducible.
- Inventory covers `.github`, root prompts, and `README.md`.
- Documentation updates for Task 01 are present.

**Depends on**: None  
**Estimated complexity**: Low  
**Type**: Documentation

## Objective
Initialize execution tracking and produce a concise baseline inventory of current `.github`, root docs, and stale-term risks to guide subsequent tasks.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`
- `.agents/changes/TMET-0001-github-context-migration/06-discrepancy-ledger.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress (create file if missing).
2. Inventory current target docs under `.github/**` and root `prompts/**`, `README.md`.
3. Build `06-discrepancy-ledger.md` with entries:
   - Old claim
   - Actual TMET behavior
   - File(s) needing fix
4. Include a short section listing files to delete (`.github-copy/**` and excluded skills/prompts if migrated by mistake).
5. Run a stale-term grep baseline for TrocaAula/Redis/Playwright/proposals/cards/compose.dev references and include summary counts in ledger.
6. Validate file paths referenced by the ledger exist in repository.
7. Update `PROGRESS.md` to mark this task as ✅ Completed.
8. Commit with a conventional commit message: `docs(context): bootstrap migration baseline and discrepancy ledger`

## Acceptance Criteria
- [ ] `PROGRESS.md` exists with task tracking rows
- [ ] `06-discrepancy-ledger.md` exists with actionable mismatches
- [ ] Baseline stale-term sweep summary captured
- [ ] Inventory covers `.github`, root prompts, and `README.md`
- [ ] Documentation updated

## Testing
- **Test file**: N/A (docs task)
- **Test cases**:
  - Verify ledger entries map to real files
  - Verify stale terms listed are reproducible by grep

## Notes
This task creates the authoritative migration checklist used by all subsequent tasks.
