/**
 * SUAP Route Tests
 * Tests for /api/suap route handlers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole, createMockRequest, createMockResponse } from '../setup.js';
import { sampleSuapSubjects } from '../fixtures.js';

// Mock fs/promises module
const mockFsPromises = {
    readFile: jest.fn(),
};

// Mock fs module
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

// Mock SUAPScraper helper
const mockSUAPScraper = {
    initialize: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue([])
};

// Mock SUAP model - used by job callbacks
// These mocks call the progress callback to cover that code path
const mockSuapInstance = {
    extractSubjects: jest.fn().mockImplementation(async (params, progressCallback) => {
        if (progressCallback) progressCallback('Extracting...');
        return undefined;
    }),
    scrapeStudents: jest.fn().mockImplementation(async (subjectId, progressCallback) => {
        if (progressCallback) progressCallback('Scraping students...');
        return [{ enrollment: '2021001', name: 'Test Student', email: 'test@email.com' }];
    })
};
const mockSUAP = jest.fn().mockImplementation(() => mockSuapInstance);

jest.unstable_mockModule('fs/promises', () => ({
    default: mockFsPromises,
    ...mockFsPromises
}));

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

jest.unstable_mockModule('../../helpers/scraper.js', () => ({
    default: mockSUAPScraper
}));

jest.unstable_mockModule('../../models/SUAP.js', () => ({
    default: mockSUAP
}));

// Import routes after mocking
const suapModule = await import('../../routes/suap.js');
const suapRouter = suapModule.default;

// Get the route handlers directly
function getRouteHandler(method, path) {
    const layer = suapRouter.stack.find(l => 
        l.route && 
        l.route.path === path && 
        l.route.methods[method]
    );
    return layer?.route.stack[0].handle;
}

describe('SUAP Route', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /students', () => {
        it('should return students data from file', async () => {
            const studentsData = {
                subjects: { "60244": ["2021001"] },
                students: { "2021001": { name: "João Silva", email: "joao@email.com" } }
            };

            mockFsPromises.readFile.mockResolvedValue(JSON.stringify(studentsData));

            const handler = getRouteHandler('get', '/students');
            const req = createMockRequest();
            const res = createMockResponse();

            await handler(req, res);

            expect(res.json).toHaveBeenCalled();
            expect(res._data.success).toBe(true);
            expect(res._data.data.subjects).toEqual(studentsData.subjects);
            expect(res._data.data.students).toEqual(studentsData.students);
        });

        it('should return empty data when file does not exist', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            mockFsPromises.readFile.mockRejectedValue(error);

            const handler = getRouteHandler('get', '/students');
            const req = createMockRequest();
            const res = createMockResponse();

            await handler(req, res);

            expect(res._data.success).toBe(true);
            expect(res._data.data).toEqual({ subjects: {}, students: {} });
        });

        it('should handle legacy file format', async () => {
            const legacyData = { oldFormat: true };
            mockFsPromises.readFile.mockResolvedValue(JSON.stringify(legacyData));

            const handler = getRouteHandler('get', '/students');
            const req = createMockRequest();
            const res = createMockResponse();

            await handler(req, res);

            expect(res._data.success).toBe(true);
            expect(res._data.data).toEqual({ subjects: {}, students: {} });
        });

        it('should handle read errors and return 500', async () => {
            mockFsPromises.readFile.mockRejectedValue(new Error('Read error'));

            const handler = getRouteHandler('get', '/students');
            const req = createMockRequest();
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.success).toBe(false);
        });
    });

    describe('POST /extract', () => {
        it('should return 202 with jobId when starting extraction', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/extract');
            const req = createMockRequest({
                body: { year: 2025, semester: 1, courses: ['INF'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBe('test-job-123');
        });

        it('should use default year and semester when not provided', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/extract');
            const req = createMockRequest({
                body: {},
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

            const handler = getRouteHandler('post', '/extract');
            const req = createMockRequest({
                body: { year: 2025, semester: 1 },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /subjects/:id/students', () => {
        it('should return 400 when subject ID is missing', async () => {
            const handler = getRouteHandler('get', '/subjects/:id/students');
            const req = createMockRequest({
                params: { id: '' }  // Empty string is falsy
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('Subject ID is required');
        });

        it('should return students for a subject', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const handler = getRouteHandler('get', '/subjects/:id/students');
            const req = createMockRequest({
                params: { id: '60244' }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.json).toHaveBeenCalled();
            expect(res._data.success).toBe(true);
            expect(res._data.subjectId).toBe('60244');
            expect(res._data.students).toHaveLength(1);
        });

        it('should handle scraping errors', async () => {
            mockSuapInstance.scrapeStudents.mockRejectedValueOnce(new Error('Browser error'));

            const handler = getRouteHandler('get', '/subjects/:id/students');
            const req = createMockRequest({
                params: { id: '60244' }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.success).toBe(false);
        });
    });

    describe('POST /extract-students', () => {
        it('should return 400 when subjectIds is missing', async () => {
            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: {}
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._data.error).toBe('Array of subject IDs is required');
        });

        it('should return 400 when subjectIds is not an array', async () => {
            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: '60244' }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
        });

        it('should return 400 when subjectIds is empty array', async () => {
            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: [] }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(400);
        });

        it('should return 202 with jobId when valid request', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: ['60244', '60245'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBe('test-job-123');
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Queue error');
                })
            };

            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: ['60244'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('Job callback execution', () => {
        it('should execute SUAP extraction job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/extract');
            const req = createMockRequest({
                body: { year: 2025, semester: 1, courses: ['INF'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toBe('SUAP data extracted successfully');
            expect(result.file).toBe('files/suap_subjects.json');
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting SUAP extraction...' });
            expect(mockSuapInstance.extractSubjects).toHaveBeenCalled();
        });

        it('should execute student extraction job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: ['60244', '60245'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('Student extraction completed');
            expect(result.results).toBeDefined();
            expect(result.results['60244']).toBeDefined();
            expect(result.results['60245']).toBeDefined();
            expect(mockSuapInstance.scrapeStudents).toHaveBeenCalledTimes(2);
        });

        it('should handle student extraction errors gracefully', async () => {
            mockSuapInstance.scrapeStudents
                .mockResolvedValueOnce([{ enrollment: '2021001', name: 'Test' }])
                .mockRejectedValueOnce(new Error('Scrape error'));

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/extract-students');
            const req = createMockRequest({
                body: { subjectIds: ['60244', '60245'] },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('2/2 subjects processed');
            expect(result.results['60244']).toBeDefined();
            expect(result.results['60245'].error).toBe('Scrape error');
        });
    });
});
