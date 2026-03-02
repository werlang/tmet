# Progress Tracker: TMET .github Context Migration

**Epic**: TMET-0001
**Started**: 2026-03-02
**Last Updated**: 2026-03-02
**HITL Mode**: false
**Current Phase**: Phase 1

---

## Task Progress by Phase

### Phase 1: Discovery and Core Instructions

| Task | Title | Status | Inspector Notes |
|------|-------|--------|-----------------|
| 01 | Bootstrap Progress and Baseline Inventory | ✅ Completed | Inspector rework resolved: stale-term baseline counts are reproducible, command provenance documented, and scope kept explicit (`.github-copy/**/*.md`) |
| 02 | Rewrite `.github/copilot-instructions.md` | ✅ Completed | Rewritten from code-truth (`server.js`, `routes/*.js`, `package.json`, `compose.yaml`, env usage grep); stale-term sweep passed for updated instructions |

**Phase Status**: ✅ Completed

### Phase 2: Skills and Prompt Migration

| Task | Title | Status | Inspector Notes |
|------|-------|--------|-----------------|
| 03 | Build Minimal TMET Skills Set | ⬜ Not Started | |
| 04 | Build TMET Prompt Set in `.github/prompts` | ⬜ Not Started | |

**Phase Status**: ⬜ Not Started

### Phase 3: Root Docs, Validation, and Release Artifacts

| Task | Title | Status | Inspector Notes |
|------|-------|--------|-----------------|
| 05 | Clean Root Docs and Remove Prompt Duplication | ⬜ Not Started | |
| 06 | Final Validation and Remove `.github-copy` | ⬜ Not Started | |
| 07 | Wrap-up Release Artifacts (`04-commit-msg.md`, `05-gitlab-mr.md`) | ⬜ Not Started | |

**Phase Status**: ⬜ Not Started

---

## Status Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed (verified by Task Inspector)
- 🔴 Incomplete (Inspector or Phase Reviewer identified gaps/issues)
- ⏸️ Skipped

---

## Completion Summary

- **Total Tasks**: 7
- **Completed**: 2
- **Incomplete**: 0
- **In Progress**: 0
- **Remaining**: 5

---

## Phase Validation (HITL & Audit Trail)

| Phase | Completed | Phase Inspector Report | Validated By | Validation Date | Status |
|-------|-----------|------------------------|--------------|-----------------|--------|
| Phase 1 | ✅ | Task 01 and Task 02 completed with documented validation evidence in change log | GitHub Copilot | 2026-03-02 | Completed |
| Phase 2 | ⬜ | (pending) | (pending) | (pending) | Not Started |
| Phase 3 | ⬜ | (pending) | (pending) | (pending) | Not Started |

---

## Change Log

| Date | Task | Action | Agent | Details |
|------|------|--------|-------|---------|
| 2026-03-02 | - | Progress file created | Ralph Orchestrator | Initial setup from planned tasks |
| 2026-03-02 | 01 | Status set to In Progress | GitHub Copilot | Began Task 01 bootstrap and baseline inventory |
| 2026-03-02 | 01 | Status set to Completed | GitHub Copilot | Inventory complete, stale-term baseline captured, and discrepancy ledger delivered |
| 2026-03-02 | 01 | Status set to Incomplete | GitHub Copilot (Inspector) | Repro check failed: stale-term counts in ledger (`Redis/Playwright/proposals|cards|compose.dev`) do not match reproducible grep baseline |
| 2026-03-02 | 01 | Status set to In Progress | GitHub Copilot | Started inspector rework to make stale-term baseline counts reproducible and scope-explicit |
| 2026-03-02 | 01 | Status set to Completed | GitHub Copilot | Rework complete: corrected stale-term counts (`7/18/24/51`), added deterministic grep commands, and validated ledger file paths |
| 2026-03-02 | 01 | Completion reconfirmed | GitHub Copilot (Inspector) | Post-rework inspection passed: reproducible stale-term baseline, explicit scope, and acceptance criteria confirmed |
| 2026-03-02 | 02 | Status set to In Progress | GitHub Copilot | Started rewrite of `.github/copilot-instructions.md` using verified TMET runtime/source-of-truth files |
| 2026-03-02 | 02 | Status set to Completed | GitHub Copilot | Instructions rewritten and validated for stale-term absence and code-truth alignment; Phase 1 marked complete |
