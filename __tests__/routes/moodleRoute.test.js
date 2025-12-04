/**
 * Moodle Route Tests
 * Tests for /api/moodle route handlers
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { suppressConsole, createMockRequest, createMockResponse } from '../setup.js';
import { sampleEdupageClasses, sampleMoodleCsvContent } from '../fixtures.js';

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Mock fs module
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

// Mock TimeTables helper
const mockTimeTables = jest.fn().mockImplementation(() => ({
    getClasses: jest.fn().mockResolvedValue(sampleEdupageClasses)
}));

// Mock MoodleUploader helper
const mockMoodleUploader = jest.fn().mockImplementation(() => ({
    uploadCourses: jest.fn().mockResolvedValue({
        success: [{ id: 1 }],
        errors: []
    })
}));

// Mock Moodle model - used by job callbacks
// These mocks call the progress callback to cover that code path
const mockMoodleInstance = {
    generateCourseCSV: jest.fn().mockImplementation(async (params, progressCallback) => {
        if (progressCallback) progressCallback('Processing...');
        return undefined;
    }),
    uploadCourses: jest.fn().mockImplementation(async (progressCallback) => {
        if (progressCallback) progressCallback('Uploading...');
        return { success: [{ id: 1 }], errors: [] };
    }),
    generateStudentCSV: jest.fn().mockImplementation(async (progressCallback) => {
        if (progressCallback) progressCallback('Generating...');
        return { totalStudents: 100, processedSubjects: 10 };
    }),
    generateProfessorCSV: jest.fn().mockImplementation(async (progressCallback) => {
        if (progressCallback) progressCallback('Generating professors...');
        return { totalProfessors: 20, processedSubjects: 10 };
    }),
    uploadStudents: jest.fn().mockImplementation(async (progressCallback) => {
        if (progressCallback) progressCallback('Uploading students...');
        return { success: [{ id: 1 }], errors: [] };
    }),
    uploadProfessors: jest.fn().mockImplementation(async (progressCallback) => {
        if (progressCallback) progressCallback('Uploading professors...');
        return { success: [{ id: 1 }], errors: [] };
    })
};
const mockMoodle = jest.fn().mockImplementation(() => mockMoodleInstance);

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

jest.unstable_mockModule('../../helpers/timetables.js', () => ({
    default: mockTimeTables
}));

jest.unstable_mockModule('../../helpers/moodle-uploader.js', () => ({
    default: mockMoodleUploader
}));

jest.unstable_mockModule('../../models/Moodle.js', () => ({
    default: mockMoodle
}));

// Import routes after mocking
const moodleModule = await import('../../routes/moodle.js');
const moodleRouter = moodleModule.default;

// Get the route handlers directly
function getRouteHandler(method, path) {
    const layer = moodleRouter.stack.find(l => 
        l.route && 
        l.route.path === path && 
        l.route.methods[method]
    );
    return layer?.route.stack[0].handle;
}

describe('Moodle Route', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe('POST /csv', () => {
        it('should return 202 with jobId when starting CSV generation', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/csv');
            const req = createMockRequest({
                body: { year: 2025, semester: 1 },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBe('test-job-123');
            expect(res._data.statusUrl).toBe('/api/jobs/test-job-123');
        });

        it('should use default year and semester when not provided', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(mockJobQueue.queue).toHaveBeenCalled();
        });

        it('should accept dateFrom and dateTo params', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/csv');
            const req = createMockRequest({
                body: {
                    year: 2025,
                    semester: 1,
                    dateFrom: '2025-01-01',
                    dateTo: '2025-06-30'
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

            const handler = getRouteHandler('post', '/csv');
            const req = createMockRequest({
                body: { year: 2025, semester: 1 },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.success).toBe(false);
        });
    });

    describe('POST /courses', () => {
        it('should return 202 with jobId when starting course upload', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/courses');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.jobId).toBe('test-job-123');
            expect(res._data.message).toBe('Course upload job started');
        });

        it('should handle errors and return 500 in production', async () => {
            process.env.NODE_ENV = 'production';

            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Upload error');
                })
            };

            const handler = getRouteHandler('post', '/courses');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('POST /students-csv', () => {
        it('should return 202 with jobId when starting students CSV generation', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/students-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.message).toBe('Students CSV generation job started');
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Generation error');
                })
            };

            const handler = getRouteHandler('post', '/students-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('POST /professors-csv', () => {
        it('should return 202 with jobId when starting professors CSV generation', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/professors-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.message).toBe('Professors CSV generation job started');
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Generation error');
                })
            };

            const handler = getRouteHandler('post', '/professors-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('POST /students', () => {
        it('should return 202 with jobId when starting student upload', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/students');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.message).toBe('Student upload job started');
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Upload error');
                })
            };

            const handler = getRouteHandler('post', '/students');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('POST /professors', () => {
        it('should return 202 with jobId when starting professor upload', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockReturnValue('test-job-123')
            };

            const handler = getRouteHandler('post', '/professors');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(202);
            expect(res._data.success).toBe(true);
            expect(res._data.message).toBe('Professor upload job started');
        });

        it('should handle errors and return 500', async () => {
            const mockJobQueue = {
                queue: jest.fn().mockImplementation(() => {
                    throw new Error('Upload error');
                })
            };

            const handler = getRouteHandler('post', '/professors');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            expect(res.statusCode).toBe(500);
        });
    });

    describe('Job callback execution', () => {
        it('should execute CSV generation job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/csv');
            const req = createMockRequest({
                body: { year: 2025, semester: 1, dateFrom: '2025-01-01', dateTo: '2025-06-30' },
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toBe('Moodle CSV generated successfully');
            expect(result.file).toBe('files/moodle_classes.csv');
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting CSV generation...' });
        });

        it('should execute course upload job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/courses');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('courses uploaded successfully');
            expect(result.results).toBeDefined();
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting course upload...' });
        });

        it('should execute students CSV job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/students-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('Students CSV generated successfully');
            expect(result.file).toBe('files/moodle_students.csv');
            expect(result.totalStudents).toBeDefined();
            expect(result.processedSubjects).toBeDefined();
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting students CSV generation...' });
        });

        it('should execute professors CSV job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/professors-csv');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('Professors CSV generated successfully');
            expect(result.file).toBe('files/moodle_professors.csv');
            expect(result.totalProfessors).toBeDefined();
            expect(result.processedSubjects).toBeDefined();
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting professors CSV generation...' });
        });

        it('should execute student upload job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/students');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('students enrolled successfully');
            expect(result.results).toBeDefined();
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting student upload...' });
        });

        it('should execute professor upload job callback correctly', async () => {
            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/professors');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            // Execute the captured callback
            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('professors enrolled successfully');
            expect(result.results).toBeDefined();
            expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting professor upload...' });
        });

        it('should handle course upload with errors', async () => {
            mockMoodleInstance.uploadCourses.mockResolvedValueOnce({
                success: [],
                errors: [{ error: 'Course already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/courses');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('failed');
        });

        it('should handle course upload with partial errors', async () => {
            mockMoodleInstance.uploadCourses.mockResolvedValueOnce({
                success: [{ id: 1 }],
                errors: [{ error: 'Course already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/courses');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('with errors');
        });

        it('should handle student upload with errors', async () => {
            mockMoodleInstance.uploadStudents.mockResolvedValueOnce({
                success: [],
                errors: [{ error: 'User already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/students');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('failed');
        });

        it('should handle student upload with partial errors', async () => {
            mockMoodleInstance.uploadStudents.mockResolvedValueOnce({
                success: [{ id: 1 }],
                errors: [{ error: 'User already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/students');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('errors');
        });

        it('should handle professor upload with errors', async () => {
            mockMoodleInstance.uploadProfessors.mockResolvedValueOnce({
                success: [],
                errors: [{ error: 'User already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/professors');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('failed');
        });

        it('should handle professor upload with partial errors', async () => {
            mockMoodleInstance.uploadProfessors.mockResolvedValueOnce({
                success: [{ id: 1 }],
                errors: [{ error: 'User already exists' }]
            });

            let capturedCallback;
            const mockJobQueue = {
                queue: jest.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return 'test-job-123';
                })
            };

            const handler = getRouteHandler('post', '/professors');
            const req = createMockRequest({
                body: {},
                app: { locals: { jobQueue: mockJobQueue } }
            });
            const res = createMockResponse();

            await handler(req, res);

            const updateProgress = jest.fn();
            const result = await capturedCallback('job-123', updateProgress);

            expect(result.message).toContain('errors');
        });
    });
});
