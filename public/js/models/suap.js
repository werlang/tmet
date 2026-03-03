import { Toast } from '../components/toast.js';
import { Request } from '../helpers/request.js';

/**
 * SUAP Model
 * Represents the SUAP system and handles all SUAP-related API operations
 * Manages SUAP subjects/courses data and extraction
 */
class SUAP {
    #subjects = [];
    #matchedSubjects = [];

    constructor() {}

    /**
     * Extract SUAP data from the SUAP system
     * @param {Object} params - Extraction parameters
     * @param {number} params.year - Year for SUAP extraction
     * @param {number} params.semester - Semester number
     * @param {string[]} params.courses - Selected courses to extract
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async extractSubjects(params, progressCallback) {
        try {
            const result = await new Request().post('/api/suap/extract', params);
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'SUAP extraction',
                progressCallback
            );

        } catch (error) {
            console.error('Extract SUAP error:', error);
            Toast.error('Error extracting SUAP: ' + error.message);
            throw error;
        }
    }

    /**
     * Poll job status until completion
     * @param {string} jobId - Job ID to poll
     * @param {string} endpoint - Status endpoint path
     * @param {string} operationName - Human-readable operation name
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Job results
     */
    async #pollJobStatus(jobId, endpoint, operationName, progressCallback) {
        const pollInterval = 1000; // 1 second
        const maxAttempts = 600; // 10 minutes
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    attempts++;
                    const status = await new Request().get(`${endpoint}/${jobId}`);

                    if (progressCallback && status.message) {
                        progressCallback(status.message);
                    }

                    if (status.status === 'completed') {
                        resolve(status.results || {});
                        return;
                    }

                    if (status.status === 'failed') {
                        throw new Error(status.error || `${operationName} failed`);
                    }

                    // Still processing
                    if (attempts >= maxAttempts) {
                        throw new Error(`${operationName} timed out`);
                    }

                    setTimeout(poll, pollInterval);

                } catch (error) {
                    reject(error);
                }
            };

            poll();
        });
    }

    /**
     * Load SUAP subjects from API
     * @returns {Promise<void>}
     */
    async loadSubjects() {
        try {
            const data = await new Request().get('/api/matches');
            const allSubjects = data.subjects || [];
            const suapSubjects = data.suapSubjects || [];
            
            // Collect matched SUAP IDs and build matched subjects list
            const matchedIds = new Set();
            this.#matchedSubjects = [];
            
            allSubjects.forEach(subject => {
                if (subject.suapId) {
                    // Handle both single ID and array of IDs
                    const ids = Array.isArray(subject.suapId) ? subject.suapId : [subject.suapId];
                    ids.forEach(id => {
                        matchedIds.add(id);
                        // Find the SUAP subject and add to matched list
                        const suapSubject = suapSubjects.find(s => s.id === id);
                        if (suapSubject && !this.#matchedSubjects.find(s => s.id === id)) {
                            this.#matchedSubjects.push(suapSubject);
                        }
                    });
                }
            });
            
            // Filter out SUAP subjects that are already matched for unmatched list
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
     * Get matched SUAP subjects
     * @returns {Array}
     */
    getMatchedSubjects() {
        return this.#matchedSubjects;
    }

    /**
     * Get SUAP subjects count
     * @returns {number}
     */
    getSubjectsCount() {
        return this.#subjects.length;
    }
}

export { SUAP };
