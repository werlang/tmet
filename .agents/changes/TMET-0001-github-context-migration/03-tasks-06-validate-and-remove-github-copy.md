# Task 6: Final Validation and Remove `.github-copy`

**Depends on**: Task 5  
**Estimated complexity**: Medium  
**Type**: Documentation

## Objective
Run final consistency validation across all changed docs, resolve residual mismatches, and remove the copied source folder.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.github/**` (final touch-ups if needed)
- `README.md` / `prompts/**` (final touch-ups if needed)
- Remove directory: `.github-copy/`
- `.agents/changes/TMET-0001-github-context-migration/07-migration-summary.md`
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Run terminology sweep for stale terms in `.github/**`, `README.md`, and root prompts.
3. Run consistency sweep for ports, routes, script names, env vars, and file paths.
4. Fix any remaining mismatches found in sweeps.
5. Remove `.github-copy/` directory.
6. Create `07-migration-summary.md` in the required summary format (files updated, mismatches fixed, remaining gaps, confidence checks).
7. Update `PROGRESS.md` to mark this task as ✅ Completed.
8. Commit with a conventional commit message: `docs(context): finalize migration validation and remove source copy`

## Acceptance Criteria
- [ ] No stale source-project residue in retained docs
- [ ] Consistency checks pass for routes/scripts/env vars/ports/paths
- [ ] `.github-copy/` removed
- [ ] Migration summary file created
- [ ] Documentation updated

## Testing
- **Test file**: N/A
- **Test cases**:
  - Grep-based stale-term check returns clean for retained docs
  - Manual spot-check against source code truth

## Notes
If any uncertainty remains, explicitly list it in `07-migration-summary.md` under “Remaining Gaps (Code, not Docs)”.
