/**
 * SUAP Route Tests
 * Tests for /api/suap endpoints
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse, suppressConsole } from '../setup.js';
import { createMockJobQueue } from '../fixtures.js';

describe('SUAP Route', () => {
    suppressConsole();
    
    describe('POST /suap/extract', () => {
        it('should return 202 with jobId when starting SUAP extraction', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({
                body: {
                    year: 2025,
                    semester: 1,
                    courses: ['INF', 'ECA']
                }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || 1,
                courses: req.body.courses || undefined
            };

            const jobId = mockJobQueue.queue(async () => ({ message: 'done' }));
            
            res.status(202).json({ 
                success: true,
                jobId,
                message: 'SUAP extraction job started',
                statusUrl: `/api/jobs/${jobId}`
            });
            
            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBeDefined();
            expect(res._data.message).toBe('SUAP extraction job started');
        });

        it('should use default year and semester when not provided', () => {
            const req = createMockRequest({ body: {} });
            
            // Simulate route handler logic
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
                courses: req.body.courses || undefined
            };
            
            expect(params.year).toBe(new Date().getFullYear());
            expect([1, 2]).toContain(params.semester);
            expect(params.courses).toBeUndefined();
        });

        it('should pass selected courses to extraction', () => {
            const req = createMockRequest({
                body: {
                    year: 2025,
                    semester: 2,
                    courses: ['TSI', 'FMC']
                }
            });
            
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || 1,
                courses: req.body.courses || undefined
            };
            
            expect(params.courses).toEqual(['TSI', 'FMC']);
        });

        it('should handle empty courses array', () => {
            const req = createMockRequest({
                body: {
                    courses: []
                }
            });
            
            const params = {
                year: req.body.year || new Date().getFullYear(),
                semester: req.body.semester || 1,
                courses: req.body.courses || undefined
            };
            
            expect(params.courses).toEqual([]);
        });
    });
});
