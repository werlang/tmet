# Implementation Plan: TMET `.github` Context Migration

## Overview
This plan rewrites repository guidance artifacts to match TMET’s current implementation with a minimal, high-signal `.github` footprint. The work is split into independent documentation streams (instructions, skills, prompts, root docs), then validated by terminology and consistency sweeps before cleanup of migration leftovers.

## Architecture Changes
No runtime architecture changes are required. This is a documentation and agent-context alignment initiative that updates:
- `.github` agent instruction and skill system
- `.github/prompts` migration/testing/audit prompts
- root documentation and prompt duplication cleanup
- removal of copied source-project residue (`.github-copy/`)

## Implementation Steps

### Step 1: Rebuild `.github/copilot-instructions.md` from code truth
**Files to modify/create**:
- `.github/copilot-instructions.md` - rewrite architecture, routes, scripts, env vars, testing, conventions

**Technical approach**:
Use `server.js`, `routes/*.js`, `models/*.js`, `helpers/*.js`, `config/*.js`, `compose.yaml`, and `package.json` as canonical sources. Replace stale service topology, route contracts, and script references with verified TMET equivalents. Keep guidance concise and operationally useful for coding agents.

**Dependencies**: None

### Step 2: Build minimal TMET skill catalog and remove excluded skills
**Files to modify/create**:
- `.github/skills/README.md` - create/replace with only retained skill list
- `.github/skills/api-development/SKILL.md` - create TMET-specific
- `.github/skills/api-development/references/route-examples.md` - create TMET route patterns
- `.github/skills/api-unit-testing-jest/SKILL.md` - create TMET-specific
- `.github/skills/api-functional-testing/SKILL.md` - create TMET-specific
- `.github/skills/docker-deployment/SKILL.md` - create TMET-specific
- `.github/skills/web-frontend/SKILL.md` - create TMET-specific
- `.github/skills/web-frontend/references/component-patterns.md` - create TMET UI patterns
- `.github/skills/debugging-operations/SKILL.md` - create TMET-specific
- `.github/skills/skill-creator/SKILL.md` - keep existing
- Remove excluded skill directories if present in `.github/skills/`

**Technical approach**:
Retain only approved minimal skills and ensure each skill has accurate “when to use,” key files, Docker-first commands, and explicit out-of-scope statements that reject non-existent systems. Keep references lightweight and project-executable.

**Dependencies**: Step 1 (for consistent shared terminology)

### Step 3: Create TMET-only `.github/prompts` set
**Files to modify/create**:
- `.github/prompts/migrate-github-context.md` - create TMET-aligned migration prompt
- `.github/prompts/audit-documentation.md` - create TMET docs audit prompt
- `.github/prompts/api-testing-coverage.md` - create TMET API coverage prompt
- Remove `.github/prompts/frontend-testing-playwright-coverage.md` if present

**Technical approach**:
Rewrite prompts around current TMET folders, endpoints, scripts, and constraints. Include output templates that require mismatch reporting and changed-file summaries. Avoid references to web/api split repos, Playwright sidecars, Redis, or proposal/card systems.

**Dependencies**: Steps 1–2

### Step 4: Clean root docs and prompt duplication
**Files to modify/create**:
- `README.md` - factual cleanup + targeted additions to fit current TMET behavior
- `prompts/migrate-github-context.md` - either align with `.github/prompts` version or remove to avoid duplication
- Any other root prompt/docs found stale during sweep

**Technical approach**:
Normalize root docs to match code truth, especially scripts, route examples, output files, and architecture labels. Ensure no duplicated stale guidance remains between root `prompts/` and `.github/prompts/`.

**Dependencies**: Steps 1–3

### Step 5: Validate consistency and remove migration residue
**Files to modify/create**:
- `.github/**` - final consistency edits as needed
- `README.md` / `prompts/**` - final consistency edits as needed
- Remove `.github-copy/` directory

**Technical approach**:
Run terminology sweeps for legacy terms and contract consistency checks (ports/routes/scripts/env vars). Resolve remaining discrepancies and delete copied source folder once all retained docs are aligned and self-consistent.

**Dependencies**: Steps 1–4

### Step 6: Final reporting artifacts for delivery
**Files to modify/create**:
- `04-commit-msg.md` - summarize user-impactful change set
- `05-gitlab-mr.md` - context, changes, usage, impact, examples

**Technical approach**:
Create concise, user-impact-oriented release documentation based on all implemented documentation changes. Include JIRA closure reference and practical usage notes for contributors/agents.

**Dependencies**: Step 5

## Testing Strategy
- **Unit tests**: Not applicable for runtime behavior (docs-only scope).
- **Integration tests**: Not applicable; perform documentation contract validation via repo scans.
- **Manual testing**:
  - Verify all documented commands exist and are executable in TMET workflow.
  - Verify all documented routes are mounted in `server.js` and defined in `routes/*.js`.
  - Verify env vars in docs are present in code usage (`process.env.*`).
  - Verify skill list in `.github/skills/README.md` matches actual directories.

## Risks and Mitigations
- **Risk 1**: Residual stale terms remain in less-visible docs → **Mitigation**: regex terminology sweep across `.github/**` and root docs.
- **Risk 2**: Prompt/skill duplication causes drift → **Mitigation**: keep one canonical TMET set under `.github`, clean or remove root duplicates.
- **Risk 3**: Over-minimization removes useful operational guidance → **Mitigation**: retain minimal approved skill set and include practical Docker-first examples.
- **Risk 4**: README changes accidentally drop useful current behavior → **Mitigation**: compare against route/model/helper implementation during rewrite.

## Rollout Considerations
- No deployment risk; documentation-only update.
- Backward compatibility: contributors using old source-project terms must switch to TMET terms/routes.
- No feature flags required.
