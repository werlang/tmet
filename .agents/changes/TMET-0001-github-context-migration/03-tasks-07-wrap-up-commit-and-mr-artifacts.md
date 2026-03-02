# Task 7: Wrap-up Release Artifacts (`04-commit-msg.md`, `05-gitlab-mr.md`)

**Depends on**: Task 6  
**Estimated complexity**: Medium  
**Type**: Documentation

## Objective
Generate final handoff artifacts summarizing user-impactful documentation migration outcomes for commit squash and GitLab MR description.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.agents/changes/TMET-0001-github-context-migration/04-commit-msg.md`
- `.agents/changes/TMET-0001-github-context-migration/05-gitlab-mr.md`
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Create `04-commit-msg.md` using conventional commit format, focused on user impact and why.
3. Create `05-gitlab-mr.md` with sections: context, changes, usage, impact, examples.
4. Ensure both files reference `TMET-0001` and line-wrap content near 100 chars.
5. Ensure artifacts describe behavior/documentation outcomes, not file-level implementation detail dumps.
6. Update `PROGRESS.md` to mark this task as ✅ Completed.
7. Commit with a conventional commit message: `docs(release): add commit and MR migration artifacts`

## Acceptance Criteria
- [ ] `04-commit-msg.md` follows requested template and scope
- [ ] `05-gitlab-mr.md` follows requested template and scope
- [ ] Both artifacts emphasize WHAT/WHY and user impact
- [ ] JIRA reference included

## Testing
- **Test file**: N/A
- **Test cases**:
  - Manual review against templates in plan/spec

## Notes
This task closes the migration package and prepares implementation handoff output.
