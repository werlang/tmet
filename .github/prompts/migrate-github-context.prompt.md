---
description: "Refresh TMET .github AI context files when skills, prompts, agents, or Copilot instructions drift from the codebase or from current prompt and skill conventions."
name: "Refresh TMET AI Context"
argument-hint: "Optional focus such as skills, prompts, or instructions"
agent: "agent"
tools: [read, search, edit]
---

Rewrite the selected TMET AI context files so they match the current repository and current customization conventions.

## Scope
- `.github/copilot-instructions.md`
- `.github/skills/**/*.md`
- `.github/prompts/*.prompt.md`
- `.github/agents/*.agent.md`
- `README.md` when it references the AI workflow

## Rules
1. Code wins over docs.
2. Keep only implemented TMET behavior.
3. Prefer updating existing files before creating new ones.
4. Prompt files must use `.prompt.md` and useful frontmatter.
5. Skill descriptions must be keyword-rich and TMET-specific.
6. Keep `.github/COMMIT.md` unchanged unless explicitly requested.

## Source of truth
- `server.js`
- `routes/*.js`
- `models/*.js`
- `helpers/*.js`
- `config/*.js`
- `compose.yaml`
- `package.json`
- `tests/**/*.test.js`

## Required output
```markdown
## TMET AI Context Refresh Summary

### Files Changed
- [path] - reason

### Mismatches Fixed
- [old claim] -> [verified fact]

### Customization Improvements
- [skill/prompt/agent] - why it now fits TMET better

### Remaining Gaps
- [item] or None
```
