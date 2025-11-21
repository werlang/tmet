# TMET - Timetables-Moodle Export Tool

A Node.js automation tool that bridges academic systems by fetching timetable data from EduPage/ASc Timetables, scraping course data from SUAP, and generating Moodle-compatible CSV files for bulk course creation. Includes a web UI for manual subject matching and REST API for automation.

## Overview

TMET automates the entire workflow of creating Moodle courses from multiple data sources. It fetches timetables from EduPage API, scrapes detailed course information from SUAP, matches subjects between systems, and uploads courses to Moodle via its web service API.

## Features

- **EduPage Integration**: Fetches classes, subjects, and teachers from EduPage API
- **SUAP Scraping**: Automated extraction of course data using Puppeteer
- **Subject Matching**: Auto-matching with manual override support via web UI
- **Web Interface**: Browser-based UI for resolving unmatched subjects
- **REST API**: Complete automation via HTTP endpoints
- **Moodle Upload**: Direct course creation via Moodle web service API
- **Docker Support**: Fully containerized with Browserless Chrome integration

## Prerequisites

- Docker & Docker Compose
- Node.js 24+ (for local development)
- Moodle web service token (for course uploads)

## Installation

### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd tmet

# Start all services
docker compose up -d

# Access web UI
open http://localhost
```

## Usage

### Web UI (Recommended)

1. **Start the services**:
   ```bash
   docker compose up -d
   ```

2. **Open the web interface** at `http://localhost`

3. **Use the pipeline controls**:
   - **Step 1: Generate CSV** - Fetches EduPage data and creates Moodle CSV
   - **Step 2: Extract SUAP** - Scrapes SUAP for course details
   - **Step 3: Upload Courses** - Creates courses in Moodle
   
4. **Manual matching**: After Steps 1-2, manually match any unmatched subjects in the UI

### CLI Usage

Run modules individually inside the container:

```bash
# Generate Moodle CSV from EduPage
docker compose exec node node modules/generate-csv.js

# Extract SUAP data
docker compose exec node node modules/extract-suap.js

# Upload courses to Moodle
docker compose exec node node modules/upload-courses.js
```

### API Usage

Automate the entire workflow via REST API:

```bash
# Step 1: Generate CSV
curl -X POST http://localhost/api/generate-csv

# Step 2: Extract SUAP
curl -X POST http://localhost/api/extract-suap

# Step 3: Check matching status
curl http://localhost/api/data

# Step 4: Manual match (if needed)
curl -X POST http://localhost/api/match \
  -H "Content-Type: application/json" \
  -d '{"moodleFullname":"[2025.2] TSI-2AN - DBE I","suapId":"12345"}'

# Step 5: Upload to Moodle
curl -X POST http://localhost/api/upload-courses
```

See [API.md](API.md) for complete API documentation.

### Output

Generated files:
- `files/moodle_classes.csv` - Moodle course import format
- `files/suap_subjects.json` - Scraped SUAP data
- `files/manual_matches.json` - User-defined subject matches

## File Structure

```
├── modules/                    # Core business logic
│   ├── generate-csv.js         # Moodle CSV generation from EduPage
│   ├── extract-suap.js         # SUAP web scraping
│   ├── matching.js             # Subject matching logic
│   └── upload-courses.js       # Moodle course creation
├── helpers/                    # Utility classes
│   ├── timetables.js           # EduPage API client
│   ├── scraper.js              # Puppeteer wrapper
│   ├── moodle-uploader.js      # Moodle API client
│   └── request.js              # HTTP helper
├── config/                     # Configuration files
│   ├── moodle-config.js        # Category mappings
│   └── suap-config.js          # SUAP selectors
├── public/                     # Web UI
│   ├── index.html              # Main page
│   ├── css/                    # Stylesheets
│   └── js/                     # Client-side scripts
├── files/                      # Data files
│   ├── moodle_classes.csv      # Generated courses
│   ├── suap_subjects.json      # Scraped SUAP data
│   └── manual_matches.json     # Manual matches
├── server.js                   # Express API server
├── compose.yaml                # Docker services
├── Dockerfile                  # Container definition
└── API.md                      # API documentation
```

## Configuration

### Environment Variables

Create a `.env` file or set in `compose.yaml`:

```env
MOODLE_URL=https://apnp.ifsul.edu.br
MOODLE_TOKEN=your_webservice_token_here
```

### Moodle Categories

Edit `config/moodle-config.js` to map class prefixes to category IDs:

```javascript
export default {
    categories: {
        'TSI': '120',  // Sistemas para Internet
        'ECA': '115',  // Engenharia de Controle e Automação
        'INF': '116',  // Informática
    }
};
```

### SUAP Configuration

Edit `config/suap-config.js` to adjust scraping selectors if SUAP layout changes.

## Data Processing & Workflow

1. **EduPage Fetch**: TimeTables helper queries EduPage API for classes, subjects, teachers
2. **SUAP Scrape**: SUAPScraper extracts detailed course information via Puppeteer
3. **Auto-matching**: System attempts to match subjects by name/class
4. **Manual Override**: Users resolve unmatched subjects via web UI
5. **CSV Generation**: Creates Moodle-compatible CSV with proper naming conventions
6. **Moodle Upload**: MoodleUploader uses web service API to create courses

## Course Naming Convention

Generated courses follow strict format:

- **Full Name**: `[{year}.{semester}] {className}{group} - {subjectName}`
  - Example: `[2025.2] TSI-2AN-G1 - Desenvolvimento Back-end I`
- **Short Name**: `CH_{className}_{subjectShort}_{year}.{semester}{group}`
  - Example: `CH_TSI_2AN_DBE1_2025.2_G1`
- **Category**: Must exist in `moodle-config.js`

## Development

### Docker Services

- **web**: Express server for UI and API (port 80 → 3000)
- **node**: Idle container for running CLI commands
- **chrome**: Browserless Chrome for Puppeteer

### Local Development

```bash
# Install dependencies
npm install

# Run web server locally
npm run ui

# Run individual modules
node modules/generate-csv.js
node modules/extract-suap.js
node modules/upload-courses.js

# Development mode (auto-reload)
docker compose exec node npm run development
```

### Scripts

- `npm run ui`: Start Express server for web UI
- `npm run development`: Run with nodemon for auto-reload

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Pablo Werlang

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Common Issues

- **Missing files**: Ensure you've run Step 1 (Generate CSV) and Step 2 (Extract SUAP) before matching
- **Category not found**: Add missing course prefixes to `config/moodle-config.js`
- **SUAP scraping fails**: Check if SUAP layout changed, update selectors in `config/suap-config.js`
- **Moodle upload fails**: Verify `MOODLE_TOKEN` is valid and has `moodle/course:create` capability
- **Chrome connection error**: Ensure `chrome` service is running: `docker compose ps`

### Check Logs

```bash
# Web service logs
docker compose logs web

# Node service logs  
docker compose logs node

# Chrome service logs
docker compose logs chrome
```

### Debugging

For detailed debugging output:
```bash
docker compose exec node node modules/generate-csv.js
```
