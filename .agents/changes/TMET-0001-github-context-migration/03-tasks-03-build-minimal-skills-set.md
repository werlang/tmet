# Task 3: Build Minimal TMET Skills Set

**Depends on**: Task 2  
**Estimated complexity**: High  
**Type**: Documentation

## Objective
Create or rewrite only the approved skills and references under `.github/skills/`, and ensure excluded skills are absent.

## ⚠️ Important information
Before coding, Read FIRST -> Load [03-tasks-00-READBEFORE.md](03-tasks-00-READBEFORE.md)

## Files to Modify/Create
- `.github/skills/README.md`
- `.github/skills/api-development/SKILL.md`
- `.github/skills/api-development/references/route-examples.md`
- `.github/skills/api-unit-testing-jest/SKILL.md`
- `.github/skills/api-functional-testing/SKILL.md`
- `.github/skills/docker-deployment/SKILL.md`
- `.github/skills/web-frontend/SKILL.md`
- `.github/skills/web-frontend/references/component-patterns.md`
- `.github/skills/debugging-operations/SKILL.md`
- `.github/skills/skill-creator/SKILL.md` (verify retained, no stale additions)
- `.agents/changes/TMET-0001-github-context-migration/PROGRESS.md`

## Detailed Steps
1. Update `PROGRESS.md` to mark this task as 🔄 In Progress.
2. Create `.github/skills/README.md` with only approved skill list and accurate descriptions.
3. Rewrite each approved SKILL file with TMET-specific workflows, key files, and Docker-first commands.
4. Add concise TMET references where needed (route examples, frontend component patterns) pointing only to existing paths.
5. Ensure each skill has clear “When to use” and “Out of scope” sections to reject non-existent systems.
6. Confirm excluded skills are not present in `.github/skills/`.
7. Run stale-term grep across `.github/skills/**`.
8. Update `PROGRESS.md` to mark this task as ✅ Completed.
9. Commit with a conventional commit message: `docs(skills): create minimal TMET skill catalog`

## Acceptance Criteria
- [ ] Skill catalog contains only approved skills
- [ ] Skill descriptions and examples map to real TMET files/routes
- [ ] Reference files are concise and valid
- [ ] Excluded skills absent
- [ ] No stale terminology in `.github/skills/**`

## Testing
- **Test file**: N/A
- **Test cases**:
  - Directory-list check for exact skill set
  - Path validation for all referenced files

## Notes
Avoid overloading skills with generic process text; optimize for practical execution context.
