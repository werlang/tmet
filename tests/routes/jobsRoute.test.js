/**
 * Jobs Route Tests
 * Tests for /api/jobs route handlers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole, createMockRequest, createMockResponse } from '../setup.js';
import { createMockJobQueue } from '../fixtures.js';

// Import routes
const jobsModule = await import('../../routes/jobs.js');
const jobsRouter = jobsModule.router;

// Get the route handlers directly
function getRouteHandler(method, path) {
    const layer = jobsRouter.stack.find(l => 
        l.route && 
        l.route.path === path && 
        l.route.methods[method]
    );
    return layer?.route.stack[0].handle;
}

describe('Jobs Route', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /:jobId', () => {
        it('should return 404 when job not found', () => {
            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(null)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'non-existent' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(mockJobQueue.getJob).toHaveBeenCalledWith('non-existent');
            expect(res.statusCode).toBe(404);
            expect(res._data.success).toBe(false);
            expect(res._data.error).toBe('Job not found');
        });

        it('should return job data when job exists', () => {
            const jobData = {
                id: 'test-job-123',
                status: 'completed',
                results: { success: true }
            };

            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(jobData)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'test-job-123' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res.json).toHaveBeenCalled();
            expect(res._data.success).toBe(true);
            expect(res._data.id).toBe('test-job-123');
            expect(res._data.status).toBe('completed');
            expect(res._data.results).toEqual({ success: true });
        });

        it('should return queued job status', () => {
            const jobData = {
                id: 'test-job-123',
                status: 'queued',
                startedAt: new Date().toISOString()
            };

            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(jobData)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'test-job-123' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res._data.status).toBe('queued');
        });

        it('should return running job with progress', () => {
            const jobData = {
                id: 'test-job-123',
                status: 'running',
                message: 'Processing item 5/10'
            };

            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(jobData)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'test-job-123' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res._data.status).toBe('running');
            expect(res._data.message).toBe('Processing item 5/10');
        });

        it('should return failed job with error', () => {
            const jobData = {
                id: 'test-job-123',
                status: 'failed',
                error: 'Connection timeout'
            };

            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(jobData)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'test-job-123' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res._data.status).toBe('failed');
            expect(res._data.error).toBe('Connection timeout');
        });

        it('should return completed lifecycle fields when present', () => {
            const jobData = {
                id: 'completed-job-321',
                status: 'completed',
                message: 'Done',
                completedAt: '2025-01-01T00:00:05.000Z',
                results: { file: 'files/moodle_classes.csv' }
            };

            const mockJobQueue = {
                getJob: jest.fn().mockReturnValue(jobData)
            };

            const handler = getRouteHandler('get', '/:jobId');
            const req = createMockRequest({
                params: { jobId: 'completed-job-321' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._data.success).toBe(true);
            expect(res._data.status).toBe('completed');
            expect(res._data.completedAt).toBe('2025-01-01T00:00:05.000Z');
            expect(res._data.results.file).toBe('files/moodle_classes.csv');
        });
    });
});
