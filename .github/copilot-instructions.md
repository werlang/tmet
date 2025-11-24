# TMET (Timetables-Moodle Export Tool) Copilot Instructions

## Project Overview
TMET is a Node.js automation tool designed to bridge academic systems. It fetches timetable data from EduPage/ASc Timetables and scrapes course data from SUAP to generate Moodle-compatible CSV files for bulk course creation. Includes a web UI for manual subject matching and REST API for complete automation.

## Architecture & Core Components

### Directory Structure
- **`modules/`**: Core business logic and executable tasks
  - `generate-csv.js`: Transforms timetable data into Moodle CSV format
  - `extract-suap.js`: Scrapes subject/class data from SUAP
  - `matching.js`: Matches Moodle subjects to SUAP subjects (supports manual overrides)
  - `upload-courses.js`: Handles Moodle course uploads via web service API
- **`helpers/`**: Reusable utility classes and services
  - `timetables.js`: Client for the EduPage API (fetches classes, subjects, teachers)
  - `scraper.js`: Puppeteer wrapper for browser automation (connects to `browserless/chrome`)
  - `moodle-uploader.js`: Moodle web service API client
  - `request.js`: HTTP request helper
- **`config/`**: Configuration files for external systems
  - `moodle-config.js`: Maps class names to Moodle category IDs
  - `suap-config.js`: Selectors and URLs for SUAP scraping
- **`public/`**: Web UI for manual matching (Express + vanilla JS)
  - `index.html`: Main UI entry point
  - `js/app.js`: Main application logic (SubjectMatcher class)
  - `js/toast.js`, `js/request.js`: Utility classes
  - `css/style.css`, `css/toast.css`: Stylesheets
- **`server.js`**: Express server providing both web UI and REST API
- **`files/`**: Data files (generated at runtime)
  - `moodle_classes.csv`: Generated Moodle courses
  - `suap_subjects.json`: Scraped SUAP data
  - `manual_matches.json`: User-defined subject matches

### Data Flow
1. **Fetch**: `TimeTables` class fetches raw JSON from EduPage API
2. **Scrape**: `SUAPScraper` extracts course details from SUAP web interface
3. **Match**: `matching.js` auto-matches subjects, respects manual overrides from `manual_matches.json`
4. **Manual UI**: Users can resolve unmatched subjects via web interface at port 80
5. **Export**: Generates `files/moodle_classes.csv` following strict naming conventions
6. **Upload**: `MoodleUploader` creates courses in Moodle via web service API

## Developer Workflow

### Docker Services
- **`web`**: Express server for UI + REST API (port 80 → 3000)
- **`node`**: Idle container for running CLI scripts manually
- **`chrome`**: Browserless Chrome for Puppeteer scraping

### Key Commands
```bash
# Start all services
docker compose up -d

# Access web UI at http://localhost
# REST API available at http://localhost/api/*

# Execute modules inside node container (alternative to API)
docker compose exec node node modules/generate-csv.js
docker compose exec node node modules/extract-suap.js
docker compose exec node node modules/upload-courses.js

# Development with auto-reload
docker compose exec node npm run development

# Restart web service after changes
docker compose restart web
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
- REST API endpoint: `POST /api/match` with `{ moodleFullname, suapId }`
- Structure: `[{ moodleFullname: "...", suapId: "..." }]`

### REST API Endpoints
- `GET /api/data` - Get matching status and subject lists
- `POST /api/match` - Create manual match
- `POST /api/generate-csv` - Execute generate-csv module
- `POST /api/extract-suap` - Execute extract-suap module
- `POST /api/upload-courses` - Execute upload-courses module
