/**
 * Matches Route Tests
 * Tests for /api/matches route handlers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole, createMockRequest, createMockResponse } from '../setup.js';
import { sampleSuapSubjects, sampleMoodleCsvContent, sampleMatches } from '../fixtures.js';

// Mock fs module
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

// Import routes after mocking
const matchesModule = await import('../../routes/matches.js');
const matchesRouter = matchesModule.default;

// Get the route handlers directly
function getRouteHandler(method, path) {
    const layer = matchesRouter.stack.find(l => 
        l.route && 
        l.route.path === path && 
        l.route.methods[method]
    );
    return layer?.route.stack[0].handle;
}

describe('Matches Route', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return matching data', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify(sampleMatches);
                }
                return '';
            });

            const handler = getRouteHandler('get', '/');
            const req = createMockRequest();
            const res = createMockResponse();

            handler(req, res);

            expect(res.json).toHaveBeenCalled();
            const data = res._data;
            expect(data).toHaveProperty('subjects');
            expect(data).toHaveProperty('noMatch');
            expect(data).toHaveProperty('suapSubjects');
        });

        it('should handle errors and return 500', () => {
            mockFs.existsSync.mockImplementation(() => {
                throw new Error('File system error');
            });

            const handler = getRouteHandler('get', '/');
            const req = createMockRequest();
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.error).toBe('File system error');
        });
    });

    describe('POST /', () => {
        it('should return 400 when moodleFullname is missing', () => {
            const handler = getRouteHandler('post', '/');
            const req = createMockRequest({ body: { suapIds: ['123'] } });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('moodleFullname is required');
        });

        it('should return 400 when suapIds/suapId is missing', () => {
            const handler = getRouteHandler('post', '/');
            const req = createMockRequest({ body: { moodleFullname: 'Test Subject' } });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('suapIds array or suapId required');
        });

        it('should create manual match with suapIds array', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([]));

            const handler = getRouteHandler('post', '/');
            const req = createMockRequest({
                body: {
                    moodleFullname: '[2025.1] Test Subject',
                    suapIds: ['123', '456']
                }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(201);
            expect(res._data.success).toBe(true);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should accept legacy suapId as single value', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([]));

            const handler = getRouteHandler('post', '/');
            const req = createMockRequest({
                body: {
                    moodleFullname: '[2025.1] Test Subject',
                    suapId: '123'
                }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(201);
            expect(res._data.success).toBe(true);
        });

        it('should handle errors and return 500', () => {
            mockFs.existsSync.mockImplementation(() => {
                throw new Error('Write error');
            });

            const handler = getRouteHandler('post', '/');
            const req = createMockRequest({
                body: {
                    moodleFullname: '[2025.1] Test Subject',
                    suapIds: ['123']
                }
            });
            const res = createMockResponse();

            handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.success).toBe(false);
        });
    });
});
