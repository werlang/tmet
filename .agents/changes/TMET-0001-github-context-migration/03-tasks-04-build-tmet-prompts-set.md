# Task 4: Build TMET Prompt Set in `.github/prompts`

**Depends on**: Task 3  
**Estimated complexity**: Medium  
**Type**: Documentation

## Objective
Create a focused TMET prompt suite under `.github/prompts` and remove unsupported prompt patterns.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.github/prompts/migrate-github-context.md`
- `.github/prompts/audit-documentation.md`
- `.github/prompts/api-testing-coverage.md`
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Create TMET-specific versions of the three approved prompts.
3. Ensure each prompt references real TMET routes, files, scripts, and constraints.
4. Include output templates requiring changed-file list + mismatch/fix reporting.
5. Exclude Playwright/frontend-sidecar assumptions unless explicitly present in TMET.
6. Run stale-term grep across `.github/prompts/**`.
7. Update `PROGRESS.md` to mark this task as ✅ Completed.
8. Commit with a conventional commit message: `docs(prompts): add TMET-aligned prompt suite`

## Acceptance Criteria
- [ ] Exactly three approved prompts exist under `.github/prompts`
- [ ] Prompt content is TMET-specific and code-verifiable
- [ ] No stale source-project residue
- [ ] Documentation updated

## Testing
- **Test file**: N/A
- **Test cases**:
  - Prompt path existence check
  - Manual verification of commands/routes against repo

## Notes
Keep prompt instructions executable for future agents, not just descriptive.
