import path from 'path';
import fs from 'fs';
import generateCSV from '../modules/generate-csv.js';
import uploadCourses from '../modules/upload-courses.js';

/**
 * Moodle Model
 * Handles Moodle-related operations (CSV generation, course uploads)
 */
export default class Moodle {
    #csvPath;

    constructor() {
        this.#csvPath = path.resolve('files', 'moodle_classes.csv');
    }

    /**
     * Generate CSV from timetables
     * @param {Object} options - Generation options
     * @param {number} options.year - Year
     * @param {number} options.semester - Semester
     * @param {string} options.dateFrom - Start date
     * @param {string} options.dateTo - End date
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<string>} CSV content
     */
    async generateCSV({ year, semester, dateFrom, dateTo }, progressCallback = null) {
        // Call the module function with progress callback
        const csv = await generateCSV(year, semester, dateFrom, dateTo, progressCallback);
        return csv;
    }

    /**
     * Upload courses to Moodle
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Upload results
     */
    async uploadCourses(progressCallback = null) {
        if (!fs.existsSync(this.#csvPath)) {
            throw new Error('CSV file not found. Generate CSV first.');
        }

        // Call the module function with progress callback
        const results = await uploadCourses(progressCallback);
        return results;
    }
}
