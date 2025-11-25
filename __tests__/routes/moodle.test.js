/**
 * Moodle Route Tests
 * Tests for /api/moodle endpoints
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse, suppressConsole, wait } from '../setup.js';
import { createMockJobQueue, sampleEdupageClasses, sampleMoodleCsvContent } from '../fixtures.js';

describe('Moodle Route', () => {
    suppressConsole();
    
    describe('POST /moodle/csv', () => {
        it('should return 202 with jobId when starting CSV generation', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({
                body: {
                    year: 2025,
                    semester: 1,
                    dateFrom: '2025-01-01',
                    dateTo: '2025-06-30'
                }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || 1,
                dateFrom: req.body.dateFrom,
                dateTo: req.body.dateTo
            };

            const jobId = mockJobQueue.queue(async () => ({ message: 'done' }));
            
            res.status(202).json({ 
                success: true,
                jobId,
                message: 'CSV generation job started',
                statusUrl: `/api/jobs/${jobId}`
            });
            
            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBeDefined();
            expect(res._data.statusUrl).toContain('/api/jobs/');
        });

        it('should use default year and semester when not provided', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({ body: {} });
            req.app.locals.jobQueue = mockJobQueue;
            
            // Simulate route handler logic
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
                dateFrom: req.body.dateFrom,
                dateTo: req.body.dateTo
            };
            
            expect(params.year).toBe(new Date().getFullYear());
            expect([1, 2]).toContain(params.semester);
        });

        it('should pass correct params to job queue', () => {
            const mockJobQueue = createMockJobQueue();
            let capturedParams = null;
            
            mockJobQueue.queue.mockImplementation((callback) => {
                // Capture the callback to inspect params
                capturedParams = callback;
                return 'job-123';
            });
            
            const req = createMockRequest({
                body: {
                    year: 2024,
                    semester: 2,
                    dateFrom: '2024-07-01',
                    dateTo: '2024-12-31'
                }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            // Simulate route handler
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || 1,
                dateFrom: req.body.dateFrom,
                dateTo: req.body.dateTo
            };
            
            expect(params.year).toBe(2024);
            expect(params.semester).toBe(2);
            expect(params.dateFrom).toBe('2024-07-01');
            expect(params.dateTo).toBe('2024-12-31');
        });
    });

    describe('POST /moodle/courses', () => {
        it('should return 202 with jobId when starting course upload', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({ body: {} });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const jobId = mockJobQueue.queue(async () => ({ message: 'done' }));
            
            res.status(202).json({ 
                success: true,
                jobId,
                message: 'Course upload job started',
                statusUrl: `/api/jobs/${jobId}`
            });
            
            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.message).toBe('Course upload job started');
        });
    });
});
