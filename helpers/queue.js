/**
 * JobQueue - Manages asynchronous job tracking and execution
 * Provides in-memory job status tracking with auto-cleanup
 */
export default class JobQueue {
    #jobs = [];
    #cleanupTimeout = 5 * 60 * 1000; // 5 minutes default
    #runningJobs = [];
    #maxConcurrentJobs = 1;

    constructor(cleanupTimeout = 5 * 60 * 1000) {
        this.#cleanupTimeout = cleanupTimeout;
    }

    /**
     * Create a new job with a unique ID
     * @returns {string} The generated job ID
     */
    createJob(callback) {
        const jobId = createUUID();
        this.#jobs.push({
            id: jobId,
            status: 'in queue',
            startedAt: new Date().toISOString(),
            callback,
        });
        return jobId;
    }

    /**
     * Get job status and data
     * @param {string} jobId - The job ID
     * @returns {Object|null} Job data or null if not found
     */
    getJob(jobId) {
        return this.#jobs.find(job => job.id === jobId) || null;
    }

    /**
     * Update job status and data
     * @param {string} jobId - The job ID
     * @param {Object} data - Partial data to merge with existing job data
     */
    updateJob(jobId, data) {
        let currentJob = this.getJob(jobId);
        if (!currentJob) {
            throw new Error(`Job ${jobId} not found`);
        }
        currentJob = { ...currentJob, ...data };
        this.#jobs = this.#jobs.map(job => (job.id === jobId ? currentJob : job));
    }

    /**
     * Mark job as completed with results
     * @param {string} jobId - The job ID
     * @param {Object} results - Job results
     * @param {string} message - Completion message
     */
    completeJob(jobId, results = {}, message = 'Job completed') {
        this.updateJob(jobId, {
            status: 'completed',
            message,
            ...results,
            completedAt: new Date().toISOString(),
        });
        this.#scheduleCleanup(jobId);
    }

    /**
     * Mark job as failed with error
     * @param {string} jobId - The job ID
     * @param {Error|string} error - Error object or message
     */
    failJob(jobId, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        this.updateJob(jobId, {
            status: 'failed',
            message: errorMessage,
            error: errorMessage,
            failedAt: new Date().toISOString(),
        });
        this.#scheduleCleanup(jobId);
    }



    /**
     * Queue a job for execution
     * @param {Function} jobFunction - Async function to execute
     * @param {Function} progressCallback - Optional callback for progress updates (jobId) => void
     * @returns {string} The job ID
     */
    async queue(jobFunction) {
        const jobId = this.createJob(jobFunction);
        
        if (this.#runningJobs.length < this.#maxConcurrentJobs) {
            this.processJob();
        }

        return jobId;
    }

    /**
     * Internal method to run the job
     * @private
     */
    async processJob() {
        try {

            if (this.#runningJobs.length >= this.#maxConcurrentJobs) return;
            
            // find first job in queue
            const nextJob = this.#jobs.find(job => !this.#runningJobs.includes(job.id));
            if (!nextJob) return;

            const { id, callback } = nextJob;
            this.#runningJobs.push(id);
            this.updateJob(id, { status: 'in progress', startedAt: new Date().toISOString() });

            console.log(`[${id}] Job started`);

            const result = await callback(id, (progressData) => {
                this.updateJob(id, { ...progressData });
            });

            console.log(`[${id}] Job completed`);
            this.completeJob(id, { results: result });

            // Remove from running jobs
            this.#runningJobs = this.#runningJobs.filter(id => id !== id);

            // Process next job if any
            this.processJob();

        } catch (error) {
            console.error(`[${jobId}] Job failed:`, error);
            this.failJob(jobId, error);
        }
    }

    /**
     * Schedule automatic cleanup of job after timeout
     * @private
     */
    #scheduleCleanup(jobId) {
        const job = this.getJob(jobId);
        if (!job) return;
        setTimeout(() => {
            this.#jobs = this.#jobs.filter(j => j.id !== jobId);
            console.log(`[${jobId}] Job cleaned up from memory`);
        }, this.#cleanupTimeout);
    }

    /**
     * Get all jobs (for debugging/monitoring)
     * @returns {Array} All jobs
     */
    getAllJobs() {
        return this.#jobs;
    }

    /**
     * Clear all jobs (for testing)
     */
    clearAll() {
        this.#jobs.clear();
    }
}
