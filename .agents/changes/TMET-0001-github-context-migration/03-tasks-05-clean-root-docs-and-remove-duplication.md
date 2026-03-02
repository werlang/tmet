# Task 5: Clean Root Docs and Remove Prompt Duplication

**Depends on**: Task 4  
**Estimated complexity**: High  
**Type**: Documentation

## Objective
Align root documentation with TMET reality, especially `README.md` and root `prompts/`, removing duplicated or stale guidance.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `README.md`
- `prompts/migrate-github-context.md` (align/remove based on duplication policy)
- Any stale root prompt files if discovered
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Rewrite stale sections in `README.md` (scripts, routes, file structure, workflow commands) using verified TMET facts.
3. Preserve useful project explanation while removing non-existent modules/endpoints/commands.
4. Clean root `prompts/` to avoid duplication with `.github/prompts/` (prefer canonical `.github` set).
5. Ensure `.github/COMMIT.md` remains unchanged.
6. Run stale-term grep across updated root docs.
7. Update `PROGRESS.md` to mark this task as ✅ Completed.
8. Commit with a conventional commit message: `docs(readme): correct TMET root documentation and prompt duplication`

## Acceptance Criteria
- [ ] `README.md` is consistent with current implementation
- [ ] Root prompts are reduced/aligned to avoid stale duplication
- [ ] `.github/COMMIT.md` unchanged
- [ ] No stale terms in updated root docs
- [ ] Documentation updated

## Testing
- **Test file**: N/A
- **Test cases**:
  - Verify every command in README exists
  - Verify listed routes are mounted routes only

## Notes
This task may include meaningful additions in README if they improve TMET clarity and remain factual.
