import { randomUUID } from 'crypto';

/**
 * JobQueue - Manages asynchronous job tracking and execution
 * Provides in-memory job status tracking with auto-cleanup
 */
class JobQueue {
    #cleanupTimeout = 5 * 60 * 1000; // 5 minutes default
    #jobs = [];
    #maxConcurrentJobs = process.env.MAX_CONCURRENT_JOBS || 1;
    #cleanupTimers = new Map(); // Track cleanup timers for cancellation

    constructor(cleanupTimeout = 5 * 60 * 1000) {
        this.#cleanupTimeout = cleanupTimeout;
    }

    /**
     * Create a new job with a unique ID
     * @returns {string} The generated job ID
     */
    createJob(callback) {
        const jobId = randomUUID();
        this.#jobs.push({
            id: jobId,
            status: 'queued',
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
     * @param {Error} error - Error object
     */
    failJob(jobId, error) {
        this.updateJob(jobId, {
            status: 'failed',
            error: error.message,
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
    queue(jobFunction) {
        const jobId = this.createJob(jobFunction);
        const runningJobs = this.#jobs.filter(job => job.status === 'running').length;
        if (runningJobs < this.#maxConcurrentJobs) {
            this.processJob();
        }

        return jobId;
    }

    /**
     * Internal method to run the job
     * @private
     */
    async processJob() {
        const runningJobs = this.#jobs.filter(job => job.status === 'running').length;
        if (runningJobs >= this.#maxConcurrentJobs) return;
        
        // find first job in queue
        const nextJob = this.#jobs.find(job => job.status === 'queued');
        if (!nextJob) return;

        const { id, callback } = nextJob;
        this.updateJob(id, { status: 'running', startedAt: new Date().toISOString() });

        console.log(`[${id}] Job started`);

        try {
            // execute job
            const result = await callback(id, (progressData) => {
                this.updateJob(id, { ...progressData });
            });

            console.log(`[${id}] Job completed`);
            this.completeJob(id, { results: result });

            // Process next job if any
            this.processJob();

        } catch (error) {
            console.error(`[${id}] Job failed:`, error);
            this.failJob(id, error);
        }
    }

    /**
     * Schedule automatic cleanup of job after timeout
     * @private
     */
    #scheduleCleanup(jobId) {
        const job = this.getJob(jobId);
        if (!job) return;
        
        const timerId = setTimeout(() => {
            this.#jobs = this.#jobs.filter(job => job.id !== jobId);
            this.#cleanupTimers.delete(jobId);
            console.log(`[${jobId}] Job cleaned up from memory`);
        }, this.#cleanupTimeout);
        
        this.#cleanupTimers.set(jobId, timerId);
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
        // Cancel all pending cleanup timers
        for (const timerId of this.#cleanupTimers.values()) {
            clearTimeout(timerId);
        }
        this.#cleanupTimers.clear();
        this.#jobs = [];
    }
}

export { JobQueue };
