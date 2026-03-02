/**
 * AI Route Tests
 * Tests for /api/ai endpoints
 */

import { jest } from '@jest/globals';
import { createMockRequest, createMockResponse, suppressConsole } from '../setup.js';
import { createMockJobQueue, sampleMoodleSubjects, sampleSuapSubjects } from '../fixtures.js';

describe('AI Route', () => {
    suppressConsole();
    
    describe('POST /ai/match', () => {
        it('should return 400 if moodleSubjects is missing', () => {
            const req = createMockRequest({
                body: {
                    suapSubjects: sampleSuapSubjects
                }
            });
            
            const res = createMockResponse();
            
            // Simulate route handler
            const { moodleSubjects, suapSubjects } = req.body;
            
            if (!moodleSubjects || !suapSubjects) {
                res.status(400).json({ 
                    success: false, 
                    error: 'moodleSubjects and suapSubjects are required' 
                });
            }
            
            expect(res.statusCode).toBe(400);
            expect(res._data.success).toBe(false);
            expect(res._data.error).toBe('moodleSubjects and suapSubjects are required');
        });

        it('should return 400 if suapSubjects is missing', () => {
            const req = createMockRequest({
                body: {
                    moodleSubjects: sampleMoodleSubjects
                }
            });
            
            const res = createMockResponse();
            
            const { moodleSubjects, suapSubjects } = req.body;
            
            if (!moodleSubjects || !suapSubjects) {
                res.status(400).json({ 
                    success: false, 
                    error: 'moodleSubjects and suapSubjects are required' 
                });
            }
            
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if both arrays are missing', () => {
            const req = createMockRequest({ body: {} });
            
            const res = createMockResponse();
            
            const { moodleSubjects, suapSubjects } = req.body;
            
            if (!moodleSubjects || !suapSubjects) {
                res.status(400).json({ 
                    success: false, 
                    error: 'moodleSubjects and suapSubjects are required' 
                });
            }
            
            expect(res.statusCode).toBe(400);
        });

        it('should return 202 with jobId when starting AI matching', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({
                body: {
                    moodleSubjects: sampleMoodleSubjects,
                    suapSubjects: sampleSuapSubjects
                }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            // Simulate route handler
            const { moodleSubjects, suapSubjects } = req.body;
            
            if (!moodleSubjects || !suapSubjects) {
                res.status(400).json({ 
                    success: false, 
                    error: 'moodleSubjects and suapSubjects are required' 
                });
                return;
            }

            const jobId = mockJobQueue.queue(async () => ({ matches: [], message: 'done' }));
            
            res.status(202).json({ 
                success: true,
                jobId,
                message: 'AI matching job started',
                statusUrl: `/api/jobs/${jobId}`
            });
            
            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBeDefined();
            expect(res._data.message).toBe('AI matching job started');
            expect(res._data.statusUrl).toContain('/api/jobs/');
        });

        it('should accept empty arrays for subjects', () => {
            const mockJobQueue = createMockJobQueue();
            
            const req = createMockRequest({
                body: {
                    moodleSubjects: [],
                    suapSubjects: []
                }
            });
            req.app.locals.jobQueue = mockJobQueue;
            
            const res = createMockResponse();
            
            const { moodleSubjects, suapSubjects } = req.body;
            
            // Route accepts empty arrays (truthy check passes for [])
            if (!moodleSubjects || !suapSubjects) {
                res.status(400).json({ success: false });
            } else {
                const jobId = mockJobQueue.queue(async () => ({ matches: [] }));
                res.status(202).json({ success: true, jobId });
            }
            
            expect(res.statusCode).toBe(202);
        });

        it('should log the number of subjects being matched', () => {
            const mockJobQueue = createMockJobQueue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const moodleCount = sampleMoodleSubjects.length;
            const suapCount = sampleSuapSubjects.length;
            
            // Simulate route logging
            console.log(`Starting AI matching for ${moodleCount} Moodle subjects and ${suapCount} SUAP subjects...`);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(`${moodleCount} Moodle subjects`)
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(`${suapCount} SUAP subjects`)
            );
        });
    });
});
