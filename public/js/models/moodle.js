import Toast from '../components/toast.js';
import Request from '../helpers/request.js';

/**
 * Moodle Model
 * Represents the Moodle system and handles all Moodle-related API operations
 * Manages Moodle courses/subjects data and operations
 */
export default class Moodle {
    #subjects = [];
    #matchedSubjects = [];

    constructor() {}

    /**
     * Generate CSV from timetables and load Moodle subjects
     * @param {Object} params - Generation parameters
     * @param {number} params.year - Year for timetable extraction
     * @param {number} params.semester - Semester number
     * @param {string} params.dateFrom - Start date
     * @param {string} params.dateTo - End date
     * @returns {Promise<Object>} Result object
     */
    async generateCSV(params) {
        try {
            const result = await Request.post('/api/generate-csv', params);
            Toast.success(result.message || 'Timetables extracted and CSV generated successfully');
            return result;
        } catch (error) {
            console.error('Generate CSV error:', error);
            Toast.error('Error generating CSV: ' + error.message);
            throw error;
        }
    }

    /**
     * Upload courses to Moodle
     * @returns {Promise<Object>} Result object
     */
    async uploadCourses() {
        try {
            const result = await Request.post('/api/upload-courses');
            const summary = result.results 
                ? `Created: ${result.results.success.length}, Failed: ${result.results.errors.length}`
                : 'Courses uploaded';
            Toast.success(result.message + '. ' + summary);
            return result;
        } catch (error) {
            console.error('Upload courses error:', error);
            Toast.error('Error uploading courses: ' + error.message);
            throw error;
        }
    }

    /**
     * Load all Moodle subjects from API
     * @returns {Promise<void>}
     */
    async loadSubjects() {
        try {
            const data = await Request.get('/api/data');
            this.#subjects = data.noMatch || [];
            this.#matchedSubjects = data.subjects?.filter(s => s.suapId) || [];
        } catch (error) {
            console.error('Moodle data loading error:', error);
            Toast.error('Error loading Moodle data.');
            throw error;
        }
    }

    /**
     * Get unmatched Moodle subjects
     * @returns {Array}
     */
    getUnmatchedSubjects() {
        return this.#subjects;
    }

    /**
     * Get matched subjects
     * @returns {Array}
     */
    getMatchedSubjects() {
        return this.#matchedSubjects;
    }

    /**
     * Get all subjects count
     * @returns {number}
     */
    getTotalSubjectsCount() {
        return this.#subjects.length + this.#matchedSubjects.length;
    }

    /**
     * Get matched subjects count
     * @returns {number}
     */
    getMatchedCount() {
        return this.#matchedSubjects.length;
    }

    /**
     * Get matching completion percentage
     * @returns {number}
     */
    getMatchingPercentage() {
        const total = this.getTotalSubjectsCount();
        return total === 0 ? 0 : (100 * this.#matchedSubjects.length / total);
    }

    /**
     * Get matching statistics
     * @returns {{total: number, matched: number, percent: number}}
     */
    getStats() {
        return {
            total: this.getTotalSubjectsCount(),
            matched: this.getMatchedCount(),
            percent: this.getMatchingPercentage()
        };
    }
}
