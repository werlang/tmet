# TMET (Timetables-Moodle Export Tool) Copilot Instructions

## Project Overview
TMET is a Node.js automation tool bridging academic systems. It fetches timetable data from EduPage API, scrapes course/student data from SUAP, and generates Moodle-compatible CSV files. Features a web UI for manual/AI-assisted subject matching and REST API for automation.

## Architecture

### Server-Side Structure
```
models/           # Business logic classes
  Moodle.js       # CSV generation, course/student uploads
  SUAP.js         # Web scraping for subjects and students  
  Match.js        # Moodle ↔ SUAP matching logic
  AIMatch.js      # AI-assisted matching via chat API

routes/           # Express route handlers (/api/*)
  moodle.js       # /moodle/csv, /moodle/courses, /moodle/students-csv
  suap.js         # /suap/subjects, /suap/students
  matches.js      # /matches (GET, POST)
  ai.js           # /ai/match
  jobs.js         # /jobs/:id (async job polling)

helpers/          # Utility classes (never executed directly)
  queue.js        # In-memory job queue with auto-cleanup
  timetables.js   # EduPage API client
  scraper.js      # Puppeteer wrapper → browserless/chrome
  moodle-uploader.js  # Moodle web service client
  chat-assist.js  # OpenAI-compatible API wrapper
```

### Client-Side Structure (public/js/)
```
app.js            # SubjectMatcherApp - main coordinator
sections/         # Page section controllers
  pipeline.js     # CSV generation, SUAP extraction, uploads
  matching.js     # Subject matching UI
  students.js     # Student enrollment UI
models/           # Client models (mirror server-side)
components/       # Reusable UI (toast.js, modals, lists)
helpers/          # request.js, date.js, text.js
```

### Key Architectural Patterns

1. **Async Job Queue**: Long-running operations (scraping, uploads) use `helpers/queue.js`
   - Routes return `202 Accepted` with `jobId` immediately
   - Clients poll `/api/jobs/:id` for status updates
   - Jobs auto-cleanup after 5 minutes
   ```javascript
   // Route pattern
   const jobId = req.app.locals.jobQueue.queue(async (jobId, updateProgress) => {
       updateProgress('Processing...');
       return { result: 'data' };
   });
   res.status(202).json({ jobId, statusUrl: `/api/jobs/${jobId}` });
   ```

2. **Model-Route Separation**: Business logic in `models/`, HTTP handling in `routes/`
   - Models are testable without HTTP context
   - Routes instantiate models and handle request/response

3. **Unified Match Storage**: All matches in `files/matches.json` with `type` field
   - Types: `auto` (computed), `manual` (user/AI-approved)
   - Manual matches override auto-matches for same Moodle subject

## Developer Workflow

### Docker Services
```bash
docker compose up -d              # Start node + chrome services
# Web UI: http://localhost        # API: http://localhost/api/*
docker compose logs -f node       # View logs (nodemon auto-reload active)
docker compose exec node npm test # Run tests
```

### Testing
```bash
docker compose exec node npm test              # Run all tests
docker compose exec node npm run test:watch    # Watch mode
docker compose exec node npm run test:coverage # Coverage report
```
- Tests in `__tests__/` mirror source structure (`models/`, `routes/`, `helpers/`)
- `fixtures.js`: Sample data for tests
- `setup.js`: Mock utilities (`createMockRequest`, `createMockResponse`)
- Uses Jest with ES modules (`--experimental-vm-modules`)

### Environment Variables
```env
MOODLE_URL=https://apnp.ifsul.edu.br
MOODLE_TOKEN=your_webservice_token
```

## Coding Conventions

### JavaScript
- **ES Modules only**: `import`/`export` exclusively
- **Private fields**: Use `#privateField` syntax
- **Async/await**: Prefer over raw Promises
- **No data attributes**: Bind data via closures in event handlers
  ```javascript
  // ❌ Bad: div.dataset.id = subject.id
  // ✅ Good: div.addEventListener('click', () => selectItem(subject))
  ```

### CSS
- Modern CSS nesting, custom properties in `:root`
- Separate files in `public/css/` (never inline)
- Component styles in `css/components/`, section styles in `css/sections/`

### Testing Pattern
```javascript
// Mock fs in tests
jest.unstable_mockModule('fs', () => mockFs);
const { default: Model } = await import('../models/Model.js');

// Use fixtures
import { sampleMoodleCsvContent, sampleSuapSubjects } from '../fixtures.js';
```

## Integration Points

### Puppeteer/Scraping
- **Always** connect to `browserless/chrome` service: `ws://chrome:3000`
- **Never** launch local Chrome instance
- Use `SUAPScraper.initialize()` before scraping

### Moodle Naming Convention
- **Full Name**: `"[2025.2] TSI-2AN-G1 - Cálculo I"`
- **Short Name**: `CH_TSI_2AN_Calc1_2025.2_G1`
- Category must exist in `config/moodle-config.js`

### REST API Routes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/moodle/csv` | POST | Generate courses CSV (async job) |
| `/api/moodle/courses` | POST | Upload courses to Moodle (async job) |
| `/api/moodle/students-csv` | POST | Generate students CSV (async job) |
| `/api/suap/subjects` | POST | Extract SUAP subjects (async job) |
| `/api/suap/students` | POST | Extract SUAP students (async job) |
| `/api/matches` | GET | Get all matches (auto-computes unmatched) |
| `/api/matches` | POST | Create manual match |
| `/api/ai/match` | POST | Start AI matching (async job) |
| `/api/jobs/:id` | GET | Poll job status |
