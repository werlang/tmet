---
name: web-frontend
description: Implement and maintain the TMET static frontend in public/. Use when changing section orchestration, UI components, request helpers, or model adapters that drive pipeline, matching, and students workflows.
---

# Web Frontend (TMET)

## Use this skill to
- Update UI logic in `public/js/sections/*`.
- Add or adjust reusable components in `public/js/components/*`.
- Keep frontend model/request contracts aligned with backend APIs.

## Key files
- `public/index.html`
- `public/js/app.js`
- `public/js/sections/` (`pipeline.js`, `matching.js`, `students.js`)
- `public/js/components/` (`progress-modal.js`, `toast.js`, modal/list components)
- `public/js/models/` (`moodle.js`, `suap.js`, `matching.js`)
- `public/js/helpers/request.js`
- `public/css/` and section/component CSS files

## Workflow
1. Start from `public/js/app.js` orchestration and pass dependencies via section constructors.
2. Keep section responsibilities narrow (pipeline vs matching vs students).
3. Route all HTTP calls through model classes and shared request helper.
4. Preserve current UX patterns: progress modal for long jobs and toast feedback for outcomes.

## References
- Read `references/component-patterns.md` for current module and interaction patterns.

## Out of scope
- Rewriting frontend with React/Vue or introducing build tooling not present in this repo.
- Frontend E2E test infrastructure not currently used by TMET.
