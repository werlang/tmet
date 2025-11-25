# TMET (Timetables-Moodle Export Tool) Copilot Instructions

## Project Overview
TMET is a Node.js automation tool that bridges academic systems. It fetches timetable data from EduPage API, scrapes course data from SUAP web interface, and generates Moodle-compatible CSV files for bulk course creation. Features a web UI for manual/AI-assisted subject matching and REST API for complete automation.

## Architecture & Core Components

### Directory Structure
- **`modules/`**: Core business logic - each is an executable task (via CLI or API)
  - `generate-csv.js`: Transforms EduPage timetable data → Moodle CSV format
  - `extract-suap.js`: Scrapes subject/class data from SUAP web interface
  - `matching.js`: Matches Moodle subjects ↔ SUAP subjects (manual overrides via `files/manual_matches.json`)
  - `upload-courses.js`: Creates courses in Moodle via web service API
- **`helpers/`**: Reusable utility classes (never executed directly)
  - `timetables.js`: EduPage API client (classes, subjects, teachers)
  - `scraper.js`: Puppeteer wrapper connecting to `browserless/chrome` Docker service
  - `moodle-uploader.js`: Moodle web service API client
  - `chat-assist.js`: OpenAI-compatible API wrapper for AI matching
  - `queue.js`: In-memory job queue with auto-cleanup for async operations
  - `request.js`: HTTP request helper
- **`config/`**: External system configuration (NOT for credentials)
  - `moodle-config.js`: Maps class name prefixes → Moodle category IDs
  - `suap-config.js`: CSS selectors and URLs for SUAP scraping
  - `chat-assist.js`: AI model and API endpoint configuration
- **`public/`**: Web UI (vanilla JS + modern CSS, NO frameworks)
  - `index.html`: Main UI entry point
  - `js/app.js`: Main application (SubjectMatcherApp class)
  - `js/components/`: Reusable UI components (toast.js, subject-list.js, ai-modal.js)
  - `js/models/`: Business logic classes (matching.js, moodle.js, suap.js)
  - `js/helpers/`: Utility functions (request.js, date.js, text.js)
  - `css/`: Stylesheets using nesting and CSS custom properties
- **`server.js`**: Express server providing both web UI and REST API
- **`files/`**: Runtime data files (generated, not committed)
  - `moodle_classes.csv`: Generated Moodle courses
  - `suap_subjects.json`: Scraped SUAP data
  - `manual_matches.json`: User-defined matches (manual + AI-approved)

### Data Flow
1. **Fetch**: `TimeTables` helper fetches raw JSON from EduPage API
2. **Generate**: `generate-csv` module transforms timetables → `files/moodle_classes.csv`
3. **Scrape**: `extract-suap` module uses Puppeteer → `files/suap_subjects.json`
4. **Match**: `matching` module auto-matches subjects, checks `files/manual_matches.json` first
5. **Manual/AI**: Web UI allows manual matching OR AI-assisted batch matching via job queue
6. **Upload**: `upload-courses` module creates courses in Moodle via web service API

### Key Architectural Patterns
- **Dual-mode execution**: All modules can run as CLI scripts OR via REST API endpoints
- **Manual override priority**: `matching.js` ALWAYS checks `manual_matches.json` before auto-matching
- **AI matching workflow**: Async job queue with polling (no websockets) - see `helpers/queue.js`
- **Data binding pattern**: UI components bind data via closures, NOT `dataset.*` attributes
- **Component structure**: Frontend uses model-component-helper pattern (NO framework dependencies)

## Developer Workflow

### Docker Services
- **`node`**: Main service (Express server + CLI execution environment)
  - Port 80:3000 (bound to 127.0.0.1 only)
  - Auto-reload via nodemon in development mode
  - Volumes: `./:/app` for live code sync, named volume for `node_modules`
- **`chrome`**: Browserless Chrome for Puppeteer scraping (ws://chrome:3000)

### Key Commands
```bash
# Start all services (includes Express server + Chrome)
docker compose up -d

# Access web UI at http://localhost
# REST API available at http://localhost/api/*

# Execute modules via API (preferred) OR directly in container:
docker compose exec node node modules/generate-csv.js
docker compose exec node node modules/extract-suap.js
docker compose exec node node modules/upload-courses.js

# Development with auto-reload (already active by default)
# Set NODE_ENV=production in compose.yaml to disable nodemon

# View logs
docker compose logs -f node

# Restart after changes (usually not needed - nodemon handles it)
docker compose restart node
```

### Typical Workflow
1. **Generate CSV**: `POST /api/generate-csv` or run `generate-csv.js` → `files/moodle_classes.csv`
2. **Extract SUAP**: `POST /api/extract-suap` or run `extract-suap.js` → `files/suap_subjects.json`
3. **Check matches**: `GET /api/data` to see matched/unmatched subjects
4. **Manual matching**: Open `http://localhost` to resolve unmatched subjects via UI
5. **Upload**: `POST /api/upload-courses` or run `upload-courses.js` to create Moodle courses

## Coding Conventions

### JavaScript Style
- **ES Modules only**: Use `import`/`export` exclusively
- **Modern OOP**: Use classes with private fields (`#privateField`)
- **No data attributes**: Bind data via closures, not `dataset.*`
  ```javascript
  // ❌ Bad
  div.dataset.id = subject.id;
  div.addEventListener('click', () => selectItem(div.dataset.id));
  
  // ✅ Good
  div.addEventListener('click', () => selectItem(div, subject));
  ```
- **Async/await**: Prefer over raw Promises
- **Error handling**: Always wrap async operations in try-catch with specific error messages
- **Element caching**: Cache DOM queries in constructor (see `SubjectMatcher#cacheElements`)

### CSS Style
- **Modern CSS**: Use nesting, CSS custom properties (`:root` vars)
- **Separate files**: Never inline styles in HTML
- **Organization**: CSS in `css/` folder, JS in `js/` folder
- **Color system**: Define colors in `:root` variables, reference throughout

### Configuration Pattern
- Keep system-specific IDs/selectors in `config/` files, not hardcoded in logic
- Example: `moodle-config.js` maps class prefixes to Moodle category IDs
- Environment variables for credentials: `MOODLE_URL`, `MOODLE_TOKEN`

### Moodle Naming Convention
Generated course names follow strict format:
- **Full Name**: `"[Year.Semester] Class - Subject"` → `"[2025.2] ECA-1AN-G1 - Cálculo I"`
- **Short Name**: `CH_Class_SubjectShort_Year.Semester_Group` → `CH_ECA_1AN_Calc1_2025.2_G1`
- **Category**: Must map to valid ID from `moodleConfig.categories`

## Integration Points

### EduPage API
- Endpoint: `https://ifsulcharq.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor`
- Requires specific JSON payload with `__args` and `vt_filter` (see `helpers/timetables.js`)
- Returns raw timetable data including classes, subjects, teachers, lessons

### SUAP Scraping
- Uses Puppeteer to scrape course book data from SUAP web interface
- Selectors and URLs configured in `config/suap-config.js`
- Extracts: course ID, name, class, and constructs fullname for matching

### Puppeteer / Scraping
- **Never** launch local Chrome instance
- **Always** connect to `browserless/chrome` service in Docker
- Use `SUAPScraper` helper which handles connection details
- Connection string: `ws://chrome:3000` (Docker network)

### Moodle API
- Uses Moodle web service REST API (`core_course_create_courses`)
- Requires valid token with `moodle/course:create` capability
- Configured via `MOODLE_URL` and `MOODLE_TOKEN` environment variables
- See `helpers/moodle-uploader.js` for implementation

### Manual Matching System
- `modules/matching.js` checks `files/manual_matches.json` first before auto-matching
- Web UI (`server.js` + `public/`) provides interface to create manual matches
- REST API endpoint: `POST /api/match` with `{ moodleFullname, suapIds }` (supports arrays)
- Structure: `[{ moodleFullname: "...", suapId: "..." }]` or `[{ moodleFullname: "...", suapId: ["id1", "id2"] }]`
- Manual matches persist across workflow re-runs and take precedence over auto-matching

### REST API Endpoints
- `GET /api/data` - Get matching status and subject lists
- `POST /api/match` - Create manual match (supports single or multiple SUAP IDs)
  - Body: `{ moodleFullname: "...", suapIds: ["id1", "id2"] }` or legacy `{ moodleFullname: "...", suapId: "id1" }`
- `POST /api/ai-match` - Start AI matching job (returns jobId)
  - Body: `{ moodleSubjects: [...], suapSubjects: [...] }`
- `GET /api/ai-match-status/:jobId` - Poll AI matching job status
- `POST /api/generate-csv` - Execute generate-csv module
- `POST /api/extract-suap` - Execute extract-suap module
- `POST /api/upload-courses` - Execute upload-courses module
