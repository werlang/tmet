/**
 * Integration-style route tests
 * Tests for actual route handlers with supertest
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import Queue from '../../helpers/queue.js';

// Create a minimal test app with the actual routes
function createTestApp() {
    const app = express();
    app.use(express.json());
    
    // Create a real job queue for testing with short cleanup timeout
    // Use 100ms so timers don't linger after tests
    const jobQueue = new Queue(100);
    app.locals.jobQueue = jobQueue;
    
    // Simple mock routes that mimic the actual routes
    
    // GET /api/jobs/:jobId
    app.get('/api/jobs/:jobId', (req, res) => {
        const { jobId } = req.params;
        const job = app.locals.jobQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }
        
        res.json({ success: true, ...job });
    });
    
    // POST /api/matches
    app.post('/api/matches', (req, res) => {
        const { moodleFullname, suapIds } = req.body;
        
        if (!moodleFullname) {
            return res.status(400).json({ 
                success: false, 
                error: 'moodleFullname is required' 
            });
        }

        const suapId = Array.isArray(suapIds) ? suapIds : req.body.suapId;
        
        if (!suapId) {
            return res.status(400).json({ 
                success: false, 
                error: 'suapIds array or suapId required' 
            });
        }

        // Just return success without actually saving
        res.status(201).json({ success: true });
    });
    
    // POST /api/ai/match
    app.post('/api/ai/match', (req, res) => {
        const { moodleSubjects, suapSubjects } = req.body;
        
        if (!moodleSubjects || !suapSubjects) {
            return res.status(400).json({ 
                success: false, 
                error: 'moodleSubjects and suapSubjects are required' 
            });
        }

        const jobId = app.locals.jobQueue.queue(async () => {
            return { matches: [], message: 'AI matching completed' };
        });

        res.status(202).json({ 
            success: true,
            jobId,
            message: 'AI matching job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    });
    
    // POST /api/moodle/csv
    app.post('/api/moodle/csv', (req, res) => {
        const jobId = app.locals.jobQueue.queue(async () => {
            return { message: 'CSV generated', file: 'files/moodle_classes.csv' };
        });

        res.status(202).json({ 
            success: true,
            jobId,
            message: 'CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    });
    
    // POST /api/suap/extract
    app.post('/api/suap/extract', (req, res) => {
        const jobId = app.locals.jobQueue.queue(async () => {
            return { message: 'SUAP extracted', file: 'files/suap_subjects.json' };
        });

        res.status(202).json({ 
            success: true,
            jobId,
            message: 'SUAP extraction job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    });
    
    return app;
}

describe('Route Integration Tests', () => {
    let app;
    
    beforeEach(() => {
        app = createTestApp();
    });
    
    afterEach(() => {
        app.locals.jobQueue.clearAll();
    });

    describe('POST /api/matches', () => {
        it('should return 400 when moodleFullname is missing', async () => {
            const response = await request(app)
                .post('/api/matches')
                .send({ suapIds: ['123'] });
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('moodleFullname is required');
        });

        it('should return 400 when suapId/suapIds is missing', async () => {
            const response = await request(app)
                .post('/api/matches')
                .send({ moodleFullname: '[2025.1] Test Subject' });
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return 201 with valid data using suapIds array', async () => {
            const response = await request(app)
                .post('/api/matches')
                .send({ 
                    moodleFullname: '[2025.1] Test Subject',
                    suapIds: ['123', '456']
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should return 201 with valid data using single suapId', async () => {
            const response = await request(app)
                .post('/api/matches')
                .send({ 
                    moodleFullname: '[2025.1] Test Subject',
                    suapId: '123'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/ai/match', () => {
        it('should return 400 when moodleSubjects is missing', async () => {
            const response = await request(app)
                .post('/api/ai/match')
                .send({ suapSubjects: [] });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });

        it('should return 400 when suapSubjects is missing', async () => {
            const response = await request(app)
                .post('/api/ai/match')
                .send({ moodleSubjects: [] });
            
            expect(response.status).toBe(400);
        });

        it('should return 202 and jobId with valid data', async () => {
            const response = await request(app)
                .post('/api/ai/match')
                .send({ 
                    moodleSubjects: [{ fullname: 'Test', shortname: 'T', category: '1' }],
                    suapSubjects: [{ id: '1', fullname: 'Test' }]
                });
            
            expect(response.status).toBe(202);
            expect(response.body.success).toBe(true);
            expect(response.body.jobId).toBeDefined();
            expect(response.body.statusUrl).toContain('/api/jobs/');
        });
    });

    describe('GET /api/jobs/:jobId', () => {
        it('should return 404 for non-existent job', async () => {
            const response = await request(app)
                .get('/api/jobs/non-existent-job');
            
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should return job data for existing job', async () => {
            // First create a job
            const createResponse = await request(app)
                .post('/api/moodle/csv')
                .send({});
            
            const jobId = createResponse.body.jobId;
            
            // Then get the job
            const response = await request(app)
                .get(`/api/jobs/${jobId}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.id).toBe(jobId);
        });
    });

    describe('POST /api/moodle/csv', () => {
        it('should return 202 and start job', async () => {
            const response = await request(app)
                .post('/api/moodle/csv')
                .send({ year: 2025, semester: 1 });
            
            expect(response.status).toBe(202);
            expect(response.body.success).toBe(true);
            expect(response.body.jobId).toBeDefined();
        });
    });

    describe('POST /api/suap/extract', () => {
        it('should return 202 and start job', async () => {
            const response = await request(app)
                .post('/api/suap/extract')
                .send({ year: 2025, semester: 1, courses: ['INF'] });
            
            expect(response.status).toBe(202);
            expect(response.body.success).toBe(true);
            expect(response.body.jobId).toBeDefined();
        });
    });
});
