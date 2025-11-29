/**
 * MoodleUploader Helper Tests
 * Tests for the MoodleUploader helper with fetch mocking
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { suppressConsole } from '../setup.js';

// Mock Request helper
const mockRequest = {
    post: jest.fn()
};

jest.unstable_mockModule('../../helpers/request.js', () => ({
    default: mockRequest
}));

// Import after mocking
const { default: MoodleUploader } = await import('../../helpers/moodle-uploader.js');

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

describe('MoodleUploader Helper', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
        // Set to production mode for tests that verify actual API behavior
        process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe('constructor', () => {
        it('should create instance with moodle URL and token', () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');

            expect(uploader.baseUrl).toBe('https://moodle.example.com');
            expect(uploader.token).toBe('test-token');
            expect(uploader.webserviceUrl).toBe('https://moodle.example.com/webservice/rest/server.php');
        });

        it('should strip trailing slash from URL', () => {
            const uploader = new MoodleUploader('https://moodle.example.com/', 'test-token');

            expect(uploader.baseUrl).toBe('https://moodle.example.com');
        });
    });

    describe('uploadCourses()', () => {
        it('should upload courses and track results', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courses = [
                { fullname: 'Test Course 1', shortname: 'TC1', category: '1' },
                { fullname: 'Test Course 2', shortname: 'TC2', category: '1' }
            ];

            const result = await uploader.uploadCourses(courses);

            expect(result.success.length).toBe(2);
            expect(result.errors.length).toBe(0);
        });

        it('should call progress callback', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const progressCallback = jest.fn();

            await uploader.uploadCourses([
                { fullname: 'Test Course', shortname: 'TC', category: '1' }
            ], progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(
                expect.stringContaining('Uploading course 1/1')
            );
        });

        it('should track errors for failed uploads', async () => {
            mockRequest.post
                .mockResolvedValueOnce([{ id: 1 }])
                .mockRejectedValueOnce(new Error('Course already exists'));

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courses = [
                { fullname: 'Test Course 1', shortname: 'TC1', category: '1' },
                { fullname: 'Test Course 2', shortname: 'TC2', category: '1' }
            ];

            const result = await uploader.uploadCourses(courses);

            expect(result.success.length).toBe(1);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].course).toBe('TC2');
            expect(result.errors[0].error).toBe('Course already exists');
        });

        it('should work without progress callback', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courses = [
                { fullname: 'Test Course', shortname: 'TC', category: '1' }
            ];

            const result = await uploader.uploadCourses(courses);

            expect(result.success.length).toBe(1);
        });
    });

    describe('createCourse()', () => {
        it('should create a single course via API', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1, shortname: 'TC1' }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.createCourse({
                fullname: 'Test Course',
                shortname: 'TC1',
                category: '1'
            });

            expect(mockRequest.post).toHaveBeenCalledWith(
                expect.stringContaining('wstoken=test-token')
            );
            expect(mockRequest.post).toHaveBeenCalledWith(
                expect.stringContaining('wsfunction=core_course_create_courses')
            );
        });

        it('should include course params in request', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.createCourse({
                fullname: 'Test Course',
                shortname: 'TC1',
                category: '115'
            });

            const callUrl = mockRequest.post.mock.calls[0][0];
            expect(callUrl).toContain('courses%5B0%5D%5Bfullname%5D=Test+Course');
            expect(callUrl).toContain('courses%5B0%5D%5Bshortname%5D=TC1');
            expect(callUrl).toContain('courses%5B0%5D%5Bcategoryid%5D=115');
        });

        it('should handle API error response', async () => {
            mockRequest.post.mockRejectedValue(new Error('API Error'));

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');

            await expect(uploader.createCourse({
                fullname: 'Test',
                shortname: 'T',
                category: '1'
            })).rejects.toThrow('API Error');
        });

        it('should skip API call outside production mode', async () => {
            process.env.NODE_ENV = 'development';

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.createCourse({
                fullname: 'Test',
                shortname: 'T',
                category: '1'
            });

            expect(result).toEqual({ skipped: true, reason: 'development mode' });
            expect(mockRequest.post).not.toHaveBeenCalled();
        });

        it('should skip API call in test mode', async () => {
            process.env.NODE_ENV = 'test';

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.createCourse({
                fullname: 'Test',
                shortname: 'T',
                category: '1'
            });

            expect(result).toEqual({ skipped: true, reason: 'development mode' });
            expect(mockRequest.post).not.toHaveBeenCalled();
        });
    });
});
