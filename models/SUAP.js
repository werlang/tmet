import path from 'path';
import fs from 'fs';
import extractSUAP from '../modules/extract-suap.js';

/**
 * SUAP Model
 * Handles SUAP extraction operations
 */
export default class SUAP {
    #dataPath;

    constructor() {
        this.#dataPath = path.resolve('files', 'suap_subjects.json');
    }

    /**
     * Extract subjects from SUAP
     * @param {Object} options - Extraction options
     * @param {number} options.year - Year
     * @param {number} options.semester - Semester
     * @param {string[]} options.courses - Course codes to extract
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Array>} Extracted subjects
     */
    async extractSubjects({ year, semester, courses: selectedCourses }, progressCallback = null) {
        // Call the module function with progress callback
        const result = await extractSUAP(year, semester, selectedCourses, progressCallback);
        return result;
    }
}
