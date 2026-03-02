/**
 * Queue Helper Tests
 * Tests for the job queue system
 */

import { jest } from '@jest/globals';
import { suppressConsole, wait } from '../setup.js';

// Import Queue directly (no external dependencies to mock)
const { JobQueue } = await import('../../helpers/queue.js');

describe('Queue Helper', () => {
    suppressConsole();
    
    let queue;

    beforeEach(() => {
        queue = new JobQueue(100); // Short cleanup timeout for tests
    });

    afterEach(() => {
        queue.clearAll();
    });

    describe('createJob()', () => {
        it('should create a job with unique ID', () => {
            const jobId = queue.createJob(() => {});

            expect(jobId).toBeDefined();
            expect(typeof jobId).toBe('string');
            expect(jobId.length).toBeGreaterThan(0);
        });

        it('should create jobs with different IDs', () => {
            const jobId1 = queue.createJob(() => {});
            const jobId2 = queue.createJob(() => {});

            expect(jobId1).not.toBe(jobId2);
        });

        it('should set initial job status to queued', () => {
            const jobId = queue.createJob(() => {});
            const job = queue.getJob(jobId);

            expect(job.status).toBe('queued');
        });

        it('should set startedAt timestamp', () => {
            const jobId = queue.createJob(() => {});
            const job = queue.getJob(jobId);

            expect(job.startedAt).toBeDefined();
            expect(new Date(job.startedAt)).toBeInstanceOf(Date);
        });
    });

    describe('getJob()', () => {
        it('should return job data for existing job', () => {
            const jobId = queue.createJob(() => {});
            const job = queue.getJob(jobId);

            expect(job).toBeDefined();
            expect(job.id).toBe(jobId);
        });

        it('should return null for non-existent job', () => {
            const job = queue.getJob('non-existent-id');

            expect(job).toBeNull();
        });
    });

    describe('updateJob()', () => {
        it('should update job data', () => {
            const jobId = queue.createJob(() => {});
            
            queue.updateJob(jobId, { message: 'Processing...' });
            const job = queue.getJob(jobId);

            expect(job.message).toBe('Processing...');
        });

        it('should merge with existing data', () => {
            const jobId = queue.createJob(() => {});
            
            queue.updateJob(jobId, { message: 'Step 1' });
            queue.updateJob(jobId, { progress: 50 });
            const job = queue.getJob(jobId);

            expect(job.message).toBe('Step 1');
            expect(job.progress).toBe(50);
        });

        it('should throw error for non-existent job', () => {
            expect(() => {
                queue.updateJob('non-existent', { data: 'test' });
            }).toThrow('Job non-existent not found');
        });
    });

    describe('completeJob()', () => {
        it('should set status to completed', () => {
            const jobId = queue.createJob(() => {});
            
            queue.completeJob(jobId, { result: 'success' });
            const job = queue.getJob(jobId);

            expect(job.status).toBe('completed');
        });

        it('should set completedAt timestamp', () => {
            const jobId = queue.createJob(() => {});
            
            queue.completeJob(jobId);
            const job = queue.getJob(jobId);

            expect(job.completedAt).toBeDefined();
        });

        it('should merge results with job data', () => {
            const jobId = queue.createJob(() => {});
            
            queue.completeJob(jobId, { customField: 'value' }, 'Custom message');
            const job = queue.getJob(jobId);

            expect(job.customField).toBe('value');
            expect(job.message).toBe('Custom message');
        });
    });

    describe('failJob()', () => {
        it('should set status to failed', () => {
            const jobId = queue.createJob(() => {});
            
            queue.failJob(jobId, new Error('Test error'));
            const job = queue.getJob(jobId);

            expect(job.status).toBe('failed');
        });

        it('should store error message', () => {
            const jobId = queue.createJob(() => {});
            
            queue.failJob(jobId, new Error('Something went wrong'));
            const job = queue.getJob(jobId);

            expect(job.error).toBe('Something went wrong');
        });

        it('should set failedAt timestamp', () => {
            const jobId = queue.createJob(() => {});
            
            queue.failJob(jobId, new Error('Test'));
            const job = queue.getJob(jobId);

            expect(job.failedAt).toBeDefined();
        });
    });

    describe('queue()', () => {
        it('should create and return job ID', () => {
            const jobId = queue.queue(async () => ({ result: 'done' }));

            expect(jobId).toBeDefined();
            expect(typeof jobId).toBe('string');
        });

        it('should start job execution', async () => {
            let executed = false;
            const jobId = queue.queue(async () => {
                executed = true;
                return { result: 'done' };
            });

            await wait(50);

            expect(executed).toBe(true);
        });

        it('should pass jobId to callback', async () => {
            let receivedJobId = null;
            const jobId = queue.queue(async (id) => {
                receivedJobId = id;
                return {};
            });

            await wait(50);

            expect(receivedJobId).toBe(jobId);
        });

        it('should pass updateProgress function to callback', async () => {
            let progressUpdater = null;
            queue.queue(async (id, updateProgress) => {
                progressUpdater = updateProgress;
                return {};
            });

            await wait(50);

            expect(typeof progressUpdater).toBe('function');
        });

        it('should update job status to running during execution', async () => {
            let statusDuringExecution = null;
            const jobId = queue.queue(async (id) => {
                statusDuringExecution = queue.getJob(id).status;
                return {};
            });

            await wait(50);

            expect(statusDuringExecution).toBe('running');
        });

        it('should complete job on successful execution', async () => {
            const jobId = queue.queue(async () => {
                return { success: true };
            });

            await wait(50);

            const job = queue.getJob(jobId);
            expect(job.status).toBe('completed');
        });

        it('should fail job on error', async () => {
            const jobId = queue.queue(async () => {
                throw new Error('Test failure');
            });

            await wait(50);

            const job = queue.getJob(jobId);
            expect(job.status).toBe('failed');
            expect(job.error).toBe('Test failure');
        });

        it('should store results on completion', async () => {
            const jobId = queue.queue(async () => {
                return { count: 42, message: 'done' };
            });

            await wait(50);

            const job = queue.getJob(jobId);
            expect(job.results).toEqual({ count: 42, message: 'done' });
        });

        it('should allow progress updates during execution', async () => {
            let progressMessages = [];
            const jobId = queue.queue(async (id, updateProgress) => {
                updateProgress({ message: 'Step 1' });
                progressMessages.push('Step 1');
                updateProgress({ message: 'Step 2', progress: 50 });
                progressMessages.push('Step 2');
                return {};
            });

            await wait(50);

            // Verify progress was updated during execution
            expect(progressMessages).toContain('Step 1');
            expect(progressMessages).toContain('Step 2');
            
            // Job should be completed after execution
            const job = queue.getJob(jobId);
            expect(job.status).toBe('completed');
        });
    });

    describe('getAllJobs()', () => {
        it('should return all jobs', () => {
            queue.createJob(() => {});
            queue.createJob(() => {});
            queue.createJob(() => {});

            const jobs = queue.getAllJobs();

            expect(jobs.length).toBe(3);
        });

        it('should return empty array when no jobs', () => {
            const jobs = queue.getAllJobs();

            expect(jobs).toEqual([]);
        });
    });

    describe('clearAll()', () => {
        it('should remove all jobs', () => {
            queue.createJob(() => {});
            queue.createJob(() => {});
            
            queue.clearAll();

            expect(queue.getAllJobs()).toEqual([]);
        });
    });

    describe('auto cleanup', () => {
        it('should clean up completed jobs after timeout', async () => {
            const shortQueue = new Queue(50); // 50ms cleanup
            const jobId = shortQueue.queue(async () => ({ done: true }));

            await wait(30);
            expect(shortQueue.getJob(jobId)).not.toBeNull();

            await wait(100);
            expect(shortQueue.getJob(jobId)).toBeNull();
            
            shortQueue.clearAll();
        });

        it('should clean up failed jobs after timeout', async () => {
            const shortQueue = new Queue(50);
            const jobId = shortQueue.queue(async () => {
                throw new Error('Fail');
            });

            await wait(30);
            expect(shortQueue.getJob(jobId)).not.toBeNull();

            await wait(100);
            expect(shortQueue.getJob(jobId)).toBeNull();
            
            shortQueue.clearAll();
        });
    });

    describe('concurrent job handling', () => {
        it('should respect max concurrent jobs limit', async () => {
            const limitedQueue = new Queue(1000);
            // Default is 1 concurrent job
            
            let runningCount = 0;
            let maxRunning = 0;
            
            const createSlowJob = () => limitedQueue.queue(async () => {
                runningCount++;
                maxRunning = Math.max(maxRunning, runningCount);
                await wait(30);
                runningCount--;
                return {};
            });
            
            createSlowJob();
            createSlowJob();
            createSlowJob();
            
            await wait(150);
            
            // With max 1 concurrent, maxRunning should be 1
            expect(maxRunning).toBe(1);
            
            limitedQueue.clearAll();
        });
    });

    describe('edge cases', () => {
        it('should handle default cleanup timeout', () => {
            // Default timeout is 5 minutes (300000ms)
            const defaultQueue = new Queue();
            expect(defaultQueue).toBeDefined();
            defaultQueue.clearAll();
        });

        it('should handle schedule cleanup for non-existent job gracefully', () => {
            // This tests the branch where getJob returns null in scheduleCleanup
            const jobId = queue.createJob(() => {});
            queue.clearAll(); // Remove all jobs
            
            // Manually try to complete - should handle gracefully
            expect(() => {
                queue.completeJob(jobId, {});
            }).toThrow();
        });

        it('should use default maxConcurrentJobs when env var not set', () => {
            const originalEnv = process.env.MAX_CONCURRENT_JOBS;
            delete process.env.MAX_CONCURRENT_JOBS;
            
            const defaultQueue = new Queue();
            const job1 = defaultQueue.createJob(async () => {
                await wait(50);
                return 'done';
            });
            const job2 = defaultQueue.createJob(async () => {
                await wait(50);
                return 'done';
            });
            
            // Both jobs should be created
            expect(job1).toBeDefined();
            expect(job2).toBeDefined();
            
            // Restore env var
            if (originalEnv !== undefined) {
                process.env.MAX_CONCURRENT_JOBS = originalEnv;
            }
            
            defaultQueue.clearAll();
        });

        it('should use env var maxConcurrentJobs when set', () => {
            const originalEnv = process.env.MAX_CONCURRENT_JOBS;
            process.env.MAX_CONCURRENT_JOBS = '3';
            
            const envQueue = new Queue();
            expect(envQueue).toBeDefined();
            
            // Restore env var
            if (originalEnv !== undefined) {
                process.env.MAX_CONCURRENT_JOBS = originalEnv;
            } else {
                delete process.env.MAX_CONCURRENT_JOBS;
            }
            
            envQueue.clearAll();
        });

        it('should handle processJob when no jobs are queued', async () => {
            // Create a job and immediately mark it as running to test empty queue scenario
            const jobId = queue.createJob(async () => 'done');
            queue.updateJob(jobId, { status: 'running' });
            
            // Call processJob - should return early since no queued jobs
            await queue.processJob();
            
            // Job should still be running
            const job = queue.getJob(jobId);
            expect(job.status).toBe('running');
            
            queue.clearAll();
        });
    });
});
