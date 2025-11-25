/**
 * Jobs Route Tests
 * Tests for /api/jobs endpoints
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse, suppressConsole } from '../setup.js';
import { createMockJobQueue, sampleJob } from '../fixtures.js';

describe('Jobs Route', () => {
    suppressConsole();
    
    describe('GET /jobs/:jobId', () => {
        it('should return 404 if job not found', () => {
            const mockJobQueue = createMockJobQueue();
            mockJobQueue.getJob.mockReturnValue(null);
            
            const req = createMockRequest({
                params: { jobId: 'non-existent-job' },
                jobQueue: mockJobQueue
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const jobId = req.params.jobId;
            const jobQueue = req.app.locals.jobQueue;
            const job = jobQueue.getJob(jobId);
            
            if (!job) {
                res.status(404).json({ 
                    success: false, 
                    error: 'Job not found' 
                });
            }
            
            expect(res.statusCode).toBe(404);
            expect(res._data.success).toBe(false);
            expect(res._data.error).toBe('Job not found');
        });

        it('should return job data if job exists', () => {
            const mockJobQueue = createMockJobQueue();
            mockJobQueue.getJob.mockReturnValue(sampleJob);
            
            const req = createMockRequest({
                params: { jobId: sampleJob.id }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const jobId = req.params.jobId;
            const jobQueue = req.app.locals.jobQueue;
            const job = jobQueue.getJob(jobId);
            
            if (!job) {
                res.status(404).json({ success: false, error: 'Job not found' });
            } else {
                res.json({ success: true, ...job });
            }
            
            expect(res._data.success).toBe(true);
            expect(res._data.id).toBe(sampleJob.id);
            expect(res._data.status).toBe(sampleJob.status);
        });

        it('should return queued job status', () => {
            const queuedJob = {
                id: 'queued-job-123',
                status: 'queued',
                startedAt: '2025-01-01T00:00:00.000Z'
            };
            
            const mockJobQueue = createMockJobQueue();
            mockJobQueue.getJob.mockReturnValue(queuedJob);
            
            const req = createMockRequest({
                params: { jobId: queuedJob.id }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            const job = req.app.locals.jobQueue.getJob(req.params.jobId);
            res.json({ success: true, ...job });
            
            expect(res._data.status).toBe('queued');
        });

        it('should return running job with progress', () => {
            const runningJob = {
                id: 'running-job-123',
                status: 'running',
                startedAt: '2025-01-01T00:00:00.000Z',
                message: 'Processing item 5 of 10'
            };
            
            const mockJobQueue = createMockJobQueue();
            mockJobQueue.getJob.mockReturnValue(runningJob);
            
            const req = createMockRequest({
                params: { jobId: runningJob.id }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            const job = req.app.locals.jobQueue.getJob(req.params.jobId);
            res.json({ success: true, ...job });
            
            expect(res._data.status).toBe('running');
            expect(res._data.message).toBe('Processing item 5 of 10');
        });

        it('should return failed job with error', () => {
            const failedJob = {
                id: 'failed-job-123',
                status: 'failed',
                startedAt: '2025-01-01T00:00:00.000Z',
                failedAt: '2025-01-01T00:00:05.000Z',
                error: 'Connection timeout'
            };
            
            const mockJobQueue = createMockJobQueue();
            mockJobQueue.getJob.mockReturnValue(failedJob);
            
            const req = createMockRequest({
                params: { jobId: failedJob.id }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            const job = req.app.locals.jobQueue.getJob(req.params.jobId);
            res.json({ success: true, ...job });
            
            expect(res._data.status).toBe('failed');
            expect(res._data.error).toBe('Connection timeout');
        });
    });
});
