---
description: "Audit TMET documentation and AI customization files for drift from the current codebase. Use when updating README, Copilot instructions, skills, prompts, or custom agents."
name: "Audit TMET Documentation"
argument-hint: "Optional files or docs scope"
agent: "agent"
tools: [read, search, edit]
---

Audit the selected TMET documentation against the current repository and fix confirmed drift.

## Audit targets
1. `README.md`
2. `.github/copilot-instructions.md`
3. `.github/skills/**/*.md`
4. `.github/prompts/*.prompt.md`
5. `.github/agents/*.agent.md`

## Source of truth
- `server.js`
- `routes/*.js`
- `models/*.js`
- `helpers/*.js`
- `config/*.js`
- `compose.yaml`
- `package.json`
- `tests/**/*.test.js`

## Checklist
- Route mounts and endpoints match code exactly.
- Test paths and commands match `tests/` and `package.json`.
- Docker guidance matches `compose.yaml`.
- Environment variables are limited to verified runtime variables.
- File references exist.
- No stale assumptions from other repositories remain.

## Required output
```markdown
## TMET Documentation Audit Summary

### Files Changed
- [path] - reason

### Mismatches Fixed
- [old claim] -> [verified fact]

### Remaining Issues
- [item] or None
```
