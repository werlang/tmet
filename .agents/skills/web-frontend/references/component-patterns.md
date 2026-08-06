# TMET Frontend Component Patterns

## High-level structure
- `public/js/app.js`: app coordinator that caches DOM elements, initializes models, wires sections, and refreshes shared data.
- `public/js/sections/*.js`: feature-level controllers (`pipeline`, `matching`, `students`).
- `public/js/components/*.js`: reusable UI units (modals, toasts, list rendering).
- `public/js/models/*.js`: API-facing data adapters.
- `public/index.html` + `public/css/`: static shell and styles. There is no frontend build step.

## Pattern 1: Section composition

Sections receive dependencies via constructor options:
- `elements`: cached DOM map from app coordinator
- model instances (`moodle`, `suap`)
- `onDataChange` callback for global refresh

This keeps section modules isolated while sharing state refresh.

## Pattern 2: Long-running action UX

For async jobs (`/api/*` returning `202`):
1. disable trigger button,
2. show `ProgressModal`,
3. stream status updates while polling,
4. hide modal and re-enable controls,
5. show success/error details with `Toast`.

## Pattern 3: Request abstraction

Use `public/js/helpers/request.js` static methods (`get`, `post`, etc.) for timeout and HTTP error normalization. Keep direct `fetch` calls out of sections where possible.

## Pattern 4: Rendering and selection logic

`matching.js` delegates list rendering and selection state to `SubjectListUI` (`components/subject-list.js`) and modal behavior to `AIMatchModal` (`components/ai-modal.js`).

## Pattern 5: Manual queue summaries

- `pipeline.js` renders manual course summary cards from `/api/moodle/manual-courses`.
- `students.js` renders manual student summary cards from `manualEnrollments` returned by `/api/suap/students`.
- Preserve these summary surfaces when extending the pipeline; they are part of the actual operator workflow.

## Path safety checklist

Before finalizing docs or code references, verify paths exist:
- `public/js/app.js`
- `public/js/sections/pipeline.js`
- `public/js/sections/matching.js`
- `public/js/sections/students.js`
- `public/js/components/progress-modal.js`
- `public/js/helpers/request.js`
