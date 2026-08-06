---
name: web-frontend
description: Implement and maintain the TMET static frontend in public/. Use when changing public/index.html, browser-native ES modules in public/js/, UI components, section controllers, or request/model adapters that drive the pipeline, matching, manual queue, and students/professors workflows.
---

# Web Frontend (TMET)

## Use this skill to
- Update UI logic in `public/js/sections/*`.
- Add or adjust reusable components in `public/js/components/*`.
- Keep frontend data adapters aligned with backend APIs and generated-file workflow stages.

## Key files
- `public/index.html`
- `public/js/app.js`
- `public/js/sections/pipeline.js`
- `public/js/sections/matching.js`
- `public/js/sections/students.js`
- `public/js/components/`
- `public/js/models/moodle.js`
- `public/js/models/suap.js`
- `public/js/models/matching.js`
- `public/js/helpers/request.js`
- `public/css/`

## Workflow
1. Start from `public/js/app.js`, which owns shared DOM references and section wiring.
2. Keep section responsibilities narrow: pipeline actions, matching actions, and students/professors actions should stay separate.
3. Route network calls through `public/js/models/*.js` or `public/js/helpers/request.js`.
4. Preserve current UX patterns: progress modal for async jobs, toasts for outcomes, and summary cards for manual course/student queues.
5. Remember this frontend is served directly from `public/`; do not introduce React, Vue, or build-tool assumptions.

## References
- Read [component patterns](./references/component-patterns.md) for current controller, request, and long-running-job UI patterns.

## Out of scope
- Rewriting the frontend with frameworks or adding a build pipeline that does not exist.
- Browser E2E infrastructure that is not already part of TMET.
