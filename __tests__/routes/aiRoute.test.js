/**
 * AI Route Tests
 * Tests for /api/ai route handlers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole, createMockRequest, createMockResponse } from '../setup.js';
import { sampleMoodleSubjects, sampleSuapSubjects, sampleAIMatchResponse } from '../fixtures.js';

// Mock ChatAssist helper
const mockChatInstance = {
    chat: jest.fn().mockResolvedValue(sampleAIMatchResponse)
};

const mockChatAssist = jest.fn().mockImplementation(() => mockChatInstance);

// Mock AIMatch model - used by job callbacks
const mockAIMatchInstance = {
    findMatches: jest.fn().mockResolvedValue([
        { moodleId: 'moodle-1', suapId: 'suap-1', confidence: 0.95 }
    ])
};
const mockAIMatch = jest.fn().mockImplementation(() => mockAIMatchInstance);

jest.unstable_mockModule('../../helpers/chat-assist.js', () => ({
    ChatAssist: mockChatAssist
}));

jest.unstable_mockModule('../../models/AIMatch.js', () => ({
    AIMatch: mockAIMatch
}));

// Import routes after mocking
const aiModule = await import('../../routes/ai.js');
const aiRouter = aiModule.router;

// Get the route handlers directly
function getRouteHandler(method, path) {
    const layer = aiRouter.stack.find(l => 
        l.route && 
        l.route.path === path && 
        l.route.methods[method]
    );
    return layer?.route.stack[0].handle;
}

describe('AI Route', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /match', () => {
        it('should return 400 when moodleSubjects is missing', async () => {
            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: { suapSubjects: sampleSuapSubjects }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('moodleSubjects and suapSubjects are required');
        });

        it('should return 400 when suapSubjects is missing', async () => {
            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: { moodleSubjects: sampleMoodleSubjects }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('moodleSubjects and suapSubjects are required');
        });

        it('should return 400 when both are missing', async () => {
            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({ body: {} });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
        });

        it('should return 202 with jobId when valid request', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: {
                    moodleSubjects: sampleMoodleSubjects,
                    suapSubjects: sampleSuapSubjects
                },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBe('test-job-123');
            expect(res._data.statusUrl).toBe('/api/jobs/test-job-123');
        });

        it('should accept empty arrays', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: {
                    moodleSubjects: [],
                    suapSubjects: []
                },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Queue error');
                })
            };

            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: {
                    moodleSubjects: sampleMoodleSubjects,
                    suapSubjects: sampleSuapSubjects
                },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.success).toBe(false);
        });
    });

    describe('Job callback execution', () => {
        it('should execute AI matching job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/match');
            const req = createMockRequest({
                body: {
                    moodleSubjects: sampleMoodleSubjects,
                    suapSubjects: sampleSuapSubjects
                },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toBe('AI matching completed');
            expect(result.matches).toBeDefined();
            expect(mockAIMatchInstance.findMatches).toHaveBeenCalledWith(
                sampleMoodleSubjects,
                sampleSuapSubjects,
                updateProgress
            );
        });
    });
});
