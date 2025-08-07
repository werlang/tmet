# TMET - Timetables-Moodle Export Tool

A Node.js tool for converting ASc Timetables XML files into Moodle-compatible CSV format for bulk course creation.

## Overview

TMET reads XML files exported from ASc Timetables software and generates a CSV file with course data formatted for import into Moodle. The tool processes classes, subjects, lessons, and groups to create properly structured course names and categories.

## Features

- **XML Parsing**: Reads ASc Timetables XML format (`.xml` files)
- **Data Processing**: Extracts and combines class, subject, lesson, and group information
- **Docker Support**: Containerized environment for consistent execution

## Prerequisites

- Node.js 24+ (Alpine Linux based)
- Docker (optional, for containerized execution)
- ASc Timetables XML export file

## Installation

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd tmet

# Install dependencies
npm install
```

### Docker

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

## Usage

1. **Prepare your data**: Place your ASc Timetables XML file in the project directory as `asctt2012.xml`

2. **Configure semester**: Edit the `semester` variable in `app.js` to match your current semester (e.g., `'2025.2'`)

3. **Run the tool**:

   **Local execution:**
   ```bash
   npm run production
   ```

   **Development mode (with nodemon):**
   ```bash
   npm run development
   ```

   **Docker execution:**
   ```bash
   docker compose up
   ```

4. **Output**: The tool generates `moodle.csv` with the following format:
   ```csv
   fullname, shortname, category
   "[2025.2] ECA-1AN-G1 - Cálculo I", "CH_ECA_1AN_Calc1_2025.2_G1", "119"
   ```

## File Structure

```
├── app.js              # Main application logic
├── reader.js           # XML parsing and data extraction
├── package.json        # Node.js dependencies and scripts
├── compose.yaml        # Docker Compose configuration
├── Dockerfile          # Container definition
├── asctt2012.xml       # Input XML file (ASc Timetables export)
└── moodle.csv          # Output CSV file (generated)
```

## Data Processing

The tool processes four main entities from the XML:

- **Classes**: Student class information (name, ID)
- **Subjects**: Course subjects (name, short name, ID)
- **Lessons**: Teaching assignments linking classes and subjects
- **Groups**: Student groups within classes

## Output Format

Generated courses follow this naming pattern:

- **Full Name**: `[{semester}] {className}{groupSuffix} - {subjectName}`
- **Short Name**: `CH_{className}_{subjectShort}_{semester}{groupSuffix}`
- **Category**: Mapped from class prefix

## Development

### Scripts

- `npm run production`: Run the application in production mode
- `npm run development`: Run with nodemon for development (includes debugging)

### Docker Development

The Docker setup includes:
- Volume mounting for live code changes
- Debug port exposure (9229) for development
- Environment variable support via `.env` file

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

- **Missing XML file**: Ensure `asctt2012.xml` exists in the project root
- **Category not found**: Add missing course prefixes to the `categories` object
- **Docker permission issues**: Ensure Docker has appropriate file system permissions

### Debug Mode

Use development mode for detailed logging:
```bash
npm run development
```

For Docker debugging, uncomment the debug port in `compose.yaml` and connect your debugger to `localhost:9229`.
