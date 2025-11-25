import Toast from '../components/toast.js';
import Request from '../helpers/request.js';

/**
 * Matching Service
 * Handles matching operations between Moodle and SUAP subjects
 */
export default class Matching {
    /**
     * Save manual match between Moodle subject and SUAP subject(s)
     * @param {string} moodleFullname - Moodle subject fullname
     * @param {string[]} suapIds - Array of SUAP IDs to match
     * @returns {Promise<Object>} Result object
     */
    static async saveMatch(moodleFullname, suapIds) {
        try {
            const result = await Request.post('/api/matches', {
                moodleFullname,
                suapIds
            });
            Toast.success(`Match saved successfully (1 Moodle → ${suapIds.length} SUAP).`);
            return result;
        } catch (error) {
            console.error('Match error:', error);
            Toast.error('Error saving match. Please try again.');
            throw error;
        }
    }

    /**
     * Start AI matching job
     * @param {Array} moodleSubjects - Unmatched Moodle subjects
     * @param {Array} suapSubjects - Unmatched SUAP subjects
     * @returns {Promise<Object>} Job result with jobId
     */
    static async startAIMatching(moodleSubjects, suapSubjects) {
        try {
            const result = await Request.post('/api/ai/match', {
                moodleSubjects,
                suapSubjects
            });
            
            if (!result.success || !result.jobId) {
                throw new Error('Failed to start AI matching job');
            }
            
            return result;
        } catch (error) {
            console.error('AI matching error:', error);
            Toast.error('Error during AI matching: ' + error.message);
            throw error;
        }
    }

    /**
     * Get AI matching job status
     * @param {string} jobId - Job ID to check
     * @returns {Promise<Object>} Job status
     */
    static async getAIMatchingStatus(jobId) {
        try {
            const status = await Request.get(`/api/jobs/${jobId}`);
            
            if (!status.success) {
                throw new Error('Failed to fetch job status');
            }
            
            return status;
        } catch (error) {
            console.error('Polling error:', error);
            Toast.error('Error checking AI matching status: ' + error.message);
            throw error;
        }
    }
}
