---
name: pipeline-workflow
description: Operate and evolve the TMET extraction to matching to CSV to Moodle-upload pipeline. Use when changing or debugging EduPage extraction, SUAP scraping, manual course or student queues, subject matching, AI matching, student/professor extraction, generated files in files/, or end-to-end operator workflow behavior.
---

# TMET Pipeline Workflow

This is the most TMET-specific skill. Use it when a task crosses more than one stage of the product workflow.

## Use this skill to
- Trace data across extraction, matching, CSV generation, and Moodle upload stages.
- Update code that reads from or writes to `files/*.json` or `files/*.csv`.
- Keep the UI, routes, models, and generated artifacts aligned when one pipeline stage changes.

## Core stages
1. EduPage timetable extraction -> Moodle course CSV generation
2. SUAP subject extraction
3. Subject matching (`auto`, `manual`, `AI`)
4. Student and professor extraction
5. Manual course and manual student queue management
6. Moodle CSV generation and upload

## Working rules
- Treat generated files as the handoff points between stages.
- Do not assume later stages can work before prerequisite files exist.
- Keep async routes observable through `/api/jobs/:jobId`.
- When one stage changes, verify whether the frontend, tests, and downstream file readers also need updates.

## References
- Read [pipeline map](./references/pipeline-map.md) for the stage-by-stage module and artifact map.

## Out of scope
- Inventing a new orchestration system outside the existing queue + file-based workflow.
- Treating generated artifacts as throwaway temp files when downstream stages depend on them.
