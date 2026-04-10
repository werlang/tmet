import { Toast } from '../components/toast.js';
import { Request } from '../helpers/request.js';

/**
 * Moodle Model
 * Represents the Moodle system and handles all Moodle-related API operations
 * Manages Moodle courses/subjects data and operations
 */
class Moodle {
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
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async generateCSV(params, progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/csv', params);
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'CSV generation',
                progressCallback
            );

        } catch (error) {
            console.error('Generate CSV error:', error);
            Toast.error('Error generating CSV: ' + error.message);
            throw error;
        }
    }

    /**
     * Upload courses to Moodle
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async uploadCourses(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/courses');
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Course upload',
                progressCallback
            );

        } catch (error) {
            console.error('Upload courses error:', error);
            Toast.error('Error uploading courses: ' + error.message);
            throw error;
        }
    }

    /**
     * Generate students CSV for Moodle bulk enrollment
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async generateStudentsCSV(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/students-csv');
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Students CSV generation',
                progressCallback
            );

        } catch (error) {
            console.error('Generate students CSV error:', error);
            Toast.error('Error generating students CSV: ' + error.message);
            throw error;
        }
    }

    async generateManualStudentsCSV(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/manual-students-csv');

            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Manual students CSV generation',
                progressCallback
            );
        } catch (error) {
            console.error('Generate manual students CSV error:', error);
            Toast.error('Error generating manual students CSV: ' + error.message);
            throw error;
        }
    }

    /**
     * Generate professors CSV for Moodle bulk enrollment
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async generateProfessorsCSV(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/professors-csv');
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Professors CSV generation',
                progressCallback
            );

        } catch (error) {
            console.error('Generate professors CSV error:', error);
            Toast.error('Error generating professors CSV: ' + error.message);
            throw error;
        }
    }

    /**
     * Upload students to Moodle
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async uploadStudents(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/students');
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Student upload',
                progressCallback
            );

        } catch (error) {
            console.error('Upload students error:', error);
            Toast.error('Error uploading students: ' + error.message);
            throw error;
        }
    }

    /**
     * Upload professors to Moodle
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result object
     */
    async uploadProfessors(progressCallback) {
        try {
            const result = await new Request().post('/api/moodle/professors');
            
            if (!result.jobId) {
                throw new Error('No job ID returned from server');
            }

            // Poll for completion
            return await this.#pollJobStatus(
                result.jobId,
                '/api/jobs',
                'Professor upload',
                progressCallback
            );

        } catch (error) {
            console.error('Upload professors error:', error);
            Toast.error('Error uploading professors: ' + error.message);
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
     * Load all Moodle subjects from API
     * @returns {Promise<void>}
     */
    async loadSubjects() {
        try {
            const data = await new Request().get('/api/matches');
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

export { Moodle };
