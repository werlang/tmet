# TMET (Timetables-Moodle Export Tool) Copilot Instructions

## Project Overview
TMET is a Node.js automation tool designed to bridge academic systems. It fetches timetable data from EduPage/ASc Timetables and scrapes course data from SUAP to generate Moodle-compatible CSV files for bulk course creation. Includes a web UI for manual subject matching.

## Architecture & Core Components

### Directory Structure
- **`modules/`**: Core business logic and executable tasks
  - `generate-csv.js`: Transforms timetable data into Moodle CSV format
  - `extract-suap.js`: Scrapes subject/class data from SUAP
  - `matching.js`: Matches Moodle subjects to SUAP subjects (supports manual overrides)
  - `upload-courses.js`: Handles Moodle course uploads
- **`helpers/`**: Reusable utility classes and services
  - `timetables.js`: Client for the EduPage API (fetches classes, subjects, teachers)
  - `scraper.js`: Puppeteer wrapper for browser automation (connects to `browserless/chrome`)
  - `request.js`: HTTP request helper
- **`config/`**: Configuration files for external systems
  - `moodle-config.js`: Maps class names to Moodle category IDs
  - `suap-config.js`: Selectors and URLs for SUAP scraping
- **`public/`**: Web UI for manual matching (Express + vanilla JS)
  - `index.html`: Main UI entry point
  - `js/app.js`: Main application logic (SubjectMatcher class)
  - `js/toast.js`, `js/request.js`: Utility classes
  - `css/style.css`, `css/toast.css`: Stylesheets
- **`server.js`**: Express server for the matching UI
- **`files/`**: Data files
  - `moodle_classes.csv`: Generated Moodle courses
  - `suap_subjects.json`: Scraped SUAP data
  - `manual_matches.json`: User-defined subject matches

### Data Flow
1. **Fetch**: `TimeTables` class fetches raw JSON from EduPage API
2. **Scrape**: `SUAPScraper` extracts course details from SUAP web interface
3. **Match**: `matching.js` auto-matches subjects, respects manual overrides from `manual_matches.json`
4. **Manual UI**: Users can resolve unmatched subjects via web interface at port 80
5. **Export**: Generates `files/moodle_classes.csv` following strict naming conventions

## Developer Workflow

### Docker Services
- **`web`**: Express server for matching UI (port 80 → 3000)
- **`node`**: Idle container for running CLI scripts manually
- **`chrome`**: Browserless Chrome for Puppeteer scraping

### Key Commands
```bash
# Start all services
docker compose up -d

# Run matching UI (already running via web service)
npm run ui  # or docker compose up web

# Execute modules inside node container
docker compose exec node node modules/generate-csv.js
docker compose exec node node modules/extract-suap.js

# Development with auto-reload
docker compose exec node npm run development
```

### Typical Workflow
1. Run `extract-suap.js` to scrape SUAP data → `files/suap_subjects.json`
2. Run `generate-csv.js` to fetch EduPage data → `files/moodle_classes.csv`
3. Open `http://localhost` to manually match unmatched subjects
4. Re-run `generate-csv.js` if needed after manual matching

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

### CSS Style
- **Modern CSS**: Use nesting, CSS custom properties (`:root` vars)
- **Separate files**: Never inline styles in HTML
- **Color system**: Define colors in `:root` variables, reference throughout

### Configuration Pattern
- Keep system-specific IDs/selectors in `config/` files, not hardcoded in logic
- Example: `moodle-config.js` maps class prefixes to Moodle category IDs

### Moodle Naming Convention
Generated course names follow strict format:
- **Full Name**: `"[Year.Semester] Class - Subject"` → `"[2025.2] ECA-1AN-G1 - Cálculo I"`
- **Short Name**: `CH_Class_SubjectShort_Year.Semester_Group` → `CH_ECA_1AN_Calc1_2025.2_G1`
- **Category**: Must map to valid ID from `moodleConfig.categories`

## Integration Points

### EduPage API
- Endpoint: `https://ifsulcharq.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor`
- Requires specific JSON payload with `__args` and `vt_filter` (see `helpers/timetables.js`)

### Puppeteer / Scraping
- **Never** launch local Chrome instance
- **Always** connect to `browserless/chrome` service in Docker
- Use `SUAPScraper` helper which handles connection details

### Manual Matching System
- `modules/matching.js` checks `files/manual_matches.json` first before auto-matching
- Web UI (`server.js` + `public/`) provides interface to create manual matches
- Structure: `[{ moodleFullname: "...", suapId: "..." }]`
