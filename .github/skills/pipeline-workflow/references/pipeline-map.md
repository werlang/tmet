# TMET Pipeline Map

## Stage 1: EduPage -> Moodle course CSV
- Route: `POST /api/moodle/csv`
- Route file: `routes/moodle.js`
- Model: `models/Moodle.js`
- Helper: `helpers/timetables.js`
- Output: `files/moodle_classes.csv`

## Stage 2: SUAP subject extraction
- Route: `POST /api/suap/extract`
- Route file: `routes/suap.js`
- Model: `models/SUAP.js`
- Helper: `helpers/scraper.js`
- Output: `files/suap_subjects.json`

## Stage 3: Subject matching
- Read/write routes:
  - `GET /api/matches`
  - `POST /api/matches`
  - `POST /api/ai/match`
- Models:
  - `models/Match.js`
  - `models/AIMatch.js`
- Inputs:
  - `files/moodle_classes.csv`
  - `files/moodle_manual_classes.csv`
  - `files/suap_subjects.json`
- Output:
  - `files/matches.json`

## Stage 4: Student and professor extraction
- Routes:
  - `POST /api/suap/extract-students`
  - `POST /api/suap/extract-professors`
  - `GET /api/suap/students`
  - `GET /api/suap/professors`
  - `POST /api/suap/manual-student`
  - `POST /api/suap/manual-student/remove`
- Model: `models/SUAP.js`
- Outputs:
  - `files/suap_students.json`
  - `files/suap_professors.json`

## Stage 5: Manual course queue
- Routes:
  - `GET /api/moodle/manual-courses`
  - `POST /api/moodle/manual-courses`
  - `POST /api/moodle/manual-courses/remove`
  - `POST /api/moodle/manual-courses-csv`
- Model: `models/Moodle.js`
- Output:
  - `files/moodle_manual_classes.csv`

## Stage 6: Enrollment CSV generation
- Routes:
  - `POST /api/moodle/students-csv`
  - `POST /api/moodle/manual-students-csv`
  - `POST /api/moodle/professors-csv`
- Model: `models/Moodle.js`
- Outputs:
  - `files/moodle_students.csv`
  - `files/moodle_manual_students.csv`
  - `files/moodle_professors.csv`

## Stage 7: Moodle upload
- Routes:
  - `POST /api/moodle/courses`
  - `POST /api/moodle/students`
  - `POST /api/moodle/professors`
- Model: `models/Moodle.js`
- Helper: `helpers/moodle-uploader.js`
- Required env:
  - `MOODLE_URL`
  - `MOODLE_TOKEN`

## Cross-cutting async behavior
- Long-running stages enqueue work through `req.app.locals.jobQueue`.
- Clients poll `GET /api/jobs/:jobId`.
- Queue implementation: `helpers/queue.js`
- Queue state is in-memory only.
