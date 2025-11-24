import Toast from '../components/toast.js';
import Request from '../helpers/request.js';

/**
 * SUAP Model
 * Represents the SUAP system and handles all SUAP-related API operations
 * Manages SUAP subjects/courses data and extraction
 */
export default class SUAP {
    #subjects = [];

    constructor() {}

    /**
     * Extract SUAP data from the SUAP system
     * @param {Object} params - Extraction parameters
     * @param {number} params.year - Year for SUAP extraction
     * @param {number} params.semester - Semester number
     * @param {string[]} params.courses - Selected courses to extract
     * @returns {Promise<Object>} Result object
     */
    async extractSubjects(params) {
        try {
            const result = await Request.post('/api/extract-suap', params);
            Toast.success(result.message || 'SUAP data extracted successfully');
            return result;
        } catch (error) {
            console.error('Extract SUAP error:', error);
            Toast.error('Error extracting SUAP: ' + error.message);
            throw error;
        }
    }

    /**
     * Load SUAP subjects from API
     * @returns {Promise<void>}
     */
    async loadSubjects() {
        try {
            const data = await Request.get('/api/data');
            const allSubjects = data.subjects || [];
            const suapSubjects = data.suapSubjects || [];
            
            // Filter out SUAP subjects that are already matched
            const matchedIds = new Set(
                allSubjects.filter(s => s.suapId).map(s => s.suapId)
            );
            
            this.#subjects = suapSubjects.filter(s => !matchedIds.has(s.id));
        } catch (error) {
            console.error('SUAP data loading error:', error);
            Toast.error('Error loading SUAP data.');
            throw error;
        }
    }

    /**
     * Get unmatched SUAP subjects
     * @returns {Array}
     */
    getUnmatchedSubjects() {
        return this.#subjects;
    }

    /**
     * Get SUAP subjects count
     * @returns {number}
     */
    getSubjectsCount() {
        return this.#subjects.length;
    }
}
