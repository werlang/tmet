# TMET Documentation Audit Prompt

Audit documentation for accuracy against the current TMET implementation.

## Objective

Find and fix documentation claims that do not match code, scripts, routes, env vars, or file layout.

## Audit Targets

1. `.github/copilot-instructions.md`
2. `.github/skills/README.md`
3. `.github/skills/*/SKILL.md`
4. `.github/prompts/*.md`
5. `README.md`
6. `prompts/*.md` (if present)

## Verification Sources

- `server.js`
- `routes/*.js`
- `models/*.js`
- `helpers/*.js`
- `config/*.js`
- `compose.yaml`
- `package.json`

## Audit Checklist

- Route mount list matches `server.js` only.
- Endpoint examples map to `routes/*.js`.
- Script names/commands exist in `package.json`.
- Docker guidance matches `compose.yaml`.
- Env vars are limited to verified runtime vars.
- No stale terms from source-project docs.
- File paths referenced in docs exist.

## Suggested Validation Commands

```bash
grep -n "app.use('/api/" server.js
grep -REn "router\.(get|post|put|patch|delete)\(" routes/*.js
grep -RhoE "process\.env\.[A-Z0-9_]+" helpers models config routes server.js | sort -u
grep -nE "\"(production|development|test|test:watch|test:coverage)\"" package.json
grep -RInE "<legacy-terms-regex>" .github README.md prompts
```

## Required Output

```markdown
## TMET Documentation Audit Summary

### Files Changed
- [path] - short reason

### Mismatches Fixed
- Fixed: <doc claim> -> <code fact>
- Removed: <stale claim>

### Validation Results
- Routes: pass/fail
- Env vars: pass/fail
- Scripts/compose: pass/fail
- Stale-term sweep: pass/fail

### Remaining Issues (Code, not docs)
- <item or "None">
```
