/**
 * MoodleUploader Helper Tests
 * Tests for the MoodleUploader helper with Request mocking
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';

// Mock Request helper
const mockRequest = {
    post: jest.fn(),
    get: jest.fn()
};

const MockRequest = jest.fn(() => mockRequest);

jest.unstable_mockModule('../../helpers/request.js', () => ({
    Request: MockRequest
}));

// Import after mocking
const { MoodleUploader } = await import('../../helpers/moodle-uploader.js');

describe('MoodleUploader Helper', () => {
    suppressConsole();

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        mockRequest.get.mockReset();
        mockRequest.post.mockReset();
    });

    describe('constructor', () => {
        it('should create instance with moodle URL and token', () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');

            expect(uploader.baseUrl).toBe('https://moodle.example.com');
            expect(uploader.token).toBe('test-token');
            expect(uploader.webserviceUrl).toBe('/webservice/rest/server.php');
        });

        it('should strip trailing slash from URL', () => {
            const uploader = new MoodleUploader('https://moodle.example.com/', 'test-token');

            expect(uploader.baseUrl).toBe('https://moodle.example.com');
        });

        it('should handle URL with multiple trailing slashes', () => {
            const uploader = new MoodleUploader('https://moodle.example.com///', 'test-token');

            // Only strips one trailing slash per regex
            expect(uploader.baseUrl).toBe('https://moodle.example.com//');
        });

        it('should handle empty token', () => {
            const uploader = new MoodleUploader('https://moodle.example.com', '');

            expect(uploader.token).toBe('');
        });
    });

    describe('uploadCourses()', () => {
        it('should upload multiple courses in batch', async () => {
            mockRequest.post
                .mockResolvedValueOnce([{ id: 1, shortname: 'TC1' }])
                .mockResolvedValueOnce([{ id: 2, shortname: 'TC2' }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courses = [
                { fullname: 'Test Course 1', shortname: 'TC1', category: '1' },
                { fullname: 'Test Course 2', shortname: 'TC2', category: '1' }
            ];

            const result = await uploader.uploadCourses(courses);

            expect(result.success).toHaveLength(2);
            expect(result.errors).toHaveLength(0);
            expect(mockRequest.post).toHaveBeenCalledTimes(2);
        });

        it('should include all course params in request', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadCourses([
                { fullname: 'Test Course', shortname: 'TC1', category: '115' }
            ]);

            const [callEndpoint, callParams] = mockRequest.post.mock.calls[0];
            expect(callEndpoint).toBe('/webservice/rest/server.php');
            expect(callParams.wstoken).toBe('test-token');
            expect(callParams.wsfunction).toBe('core_course_create_courses');
            expect(callParams['courses[0][fullname]']).toBe('Test Course');
            expect(callParams['courses[0][shortname]']).toBe('TC1');
            expect(callParams['courses[0][categoryid]']).toBe('115');
        });

        it('should handle Moodle API error response with exception', async () => {
            mockRequest.post.mockResolvedValue({
                exception: 'moodle_exception',
                errorcode: 'shortnametaken',
                message: 'Short name is already taken'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadCourses([
                { fullname: 'Test', shortname: 'TC1', category: '1' }
            ]);

            expect(result.success).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].batch).toBe(1);
            expect(result.errors[0].courses).toEqual(['TC1']);
            expect(result.errors[0].error).toBe('Short name is already taken');
        });

        it('should handle Moodle API error response with errorcode only', async () => {
            mockRequest.post.mockResolvedValue({
                errorcode: 'invalidtoken',
                exception: 'Invalid token'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadCourses([
                { fullname: 'Test', shortname: 'TC1', category: '1' }
            ]);

            expect(result.success).toHaveLength(0);
            expect(result.errors[0].error).toBe('Invalid token');
        });

        it('should handle empty courses array', async () => {
            mockRequest.post.mockResolvedValue([]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadCourses([]);

            expect(result.success).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle non-array success response', async () => {
            mockRequest.post.mockResolvedValue({ id: 1 }); // Not an array

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadCourses([
                { fullname: 'Test', shortname: 'TC1', category: '1' }
            ]);

            expect(result.success).toHaveLength(0); // Falls back to empty array
        });
    });

    describe('enrollUsers()', () => {
        it('should enroll multiple users in courses', async () => {
            // enrol_manual_enrol_users returns null on success
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const enrollments = [
                { userid: 1, courseid: 10, roleid: 5 },
                { userid: 2, courseid: 10, roleid: 5 }
            ];

            const result = await uploader.enrollUsers(enrollments);

            expect(result.success).toEqual(enrollments);
            expect(result.errors).toHaveLength(0);
        });

        it('should include enrollment params in request', async () => {
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.enrollUsers([
                { userid: 123, courseid: 456, roleid: 5 }
            ]);

            const [callEndpoint, callParams] = mockRequest.post.mock.calls[0];
            expect(callEndpoint).toBe('/webservice/rest/server.php');
            expect(callParams.wsfunction).toBe('enrol_manual_enrol_users');
            expect(callParams['enrolments[0][roleid]']).toBe(5);
            expect(callParams['enrolments[0][userid]']).toBe(123);
            expect(callParams['enrolments[0][courseid]']).toBe(456);
        });

        it('should handle Moodle API error response', async () => {
            mockRequest.post.mockResolvedValue({
                exception: 'moodle_exception',
                errorcode: 'cannotenrol',
                message: 'Cannot enroll user'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.enrollUsers([
                { userid: 1, courseid: 10, roleid: 5 }
            ]);

            expect(result.success).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].user).toBe('all');
            expect(result.errors[0].error).toBe('Cannot enroll user');
        });

        it('should handle empty enrollments array', async () => {
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.enrollUsers([]);

            expect(result.success).toHaveLength(0);
        });
    });

    describe('getUserByUsername()', () => {
        it('should return user ID when user exists', async () => {
            mockRequest.get.mockResolvedValue({
                users: [{ id: 42, username: 'johndoe' }]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.getUserByUsername('johndoe');

            expect(userId).toBe(42);
        });

        it('should include correct params in request', async () => {
            mockRequest.get.mockResolvedValue({ users: [] });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.getUserByUsername('testuser');

            const [callEndpoint, queryString] = mockRequest.get.mock.calls[0];
            expect(callEndpoint).toBe('/webservice/rest/server.php');
            expect(queryString).toContain('wsfunction=core_user_get_users');
            expect(queryString).toContain('criteria%5B0%5D%5Bkey%5D=username');
            expect(queryString).toContain('criteria%5B0%5D%5Bvalue%5D=testuser');
        });

        it('should return null when user not found', async () => {
            mockRequest.get.mockResolvedValue({ users: [] });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.getUserByUsername('nonexistent');

            expect(userId).toBeNull();
        });

        it('should return null when users array is missing', async () => {
            mockRequest.get.mockResolvedValue({});

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.getUserByUsername('testuser');

            expect(userId).toBeNull();
        });

        it('should return first user when multiple match', async () => {
            mockRequest.get.mockResolvedValue({
                users: [
                    { id: 10, username: 'john' },
                    { id: 20, username: 'john' }
                ]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.getUserByUsername('john');

            expect(userId).toBe(10);
        });
    });

    describe('getCourseByShortname()', () => {
        it('should return course ID when course exists', async () => {
            mockRequest.get.mockResolvedValue({
                courses: [{ id: 99, shortname: 'MATH101' }]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courseId = await uploader.getCourseByShortname('MATH101');

            expect(courseId).toBe(99);
        });

        it('should include correct params in request', async () => {
            mockRequest.get.mockResolvedValue({ courses: [] });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.getCourseByShortname('TEST_COURSE');

            const [callEndpoint, queryString] = mockRequest.get.mock.calls[0];
            expect(callEndpoint).toBe('/webservice/rest/server.php');
            expect(queryString).toContain('wsfunction=core_course_get_courses_by_field');
            expect(queryString).toContain('field=shortname');
            expect(queryString).toContain('value=TEST_COURSE');
        });

        it('should return null when course not found', async () => {
            mockRequest.get.mockResolvedValue({ courses: [] });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courseId = await uploader.getCourseByShortname('NONEXISTENT');

            expect(courseId).toBeNull();
        });

        it('should return null when courses array is missing', async () => {
            mockRequest.get.mockResolvedValue({});

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courseId = await uploader.getCourseByShortname('TEST');

            expect(courseId).toBeNull();
        });
    });

    describe('createUser()', () => {
        it('should create user and return ID', async () => {
            mockRequest.post.mockResolvedValue([{ id: 55, username: 'newuser' }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.createUser({
                username: 'newuser',
                password: 'Pass123!',
                firstname: 'John',
                lastname: 'Doe',
                email: 'john@example.com'
            });

            expect(userId).toBe(55);
        });

        it('should include all user params in request', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.createUser({
                username: 'jdoe',
                password: 'Secret123',
                firstname: 'Jane',
                lastname: 'Doe',
                email: 'jane@test.com'
            });

            const [callEndpoint, callParams] = mockRequest.post.mock.calls[0];
            expect(callEndpoint).toBe('/webservice/rest/server.php');
            expect(callParams.wsfunction).toBe('core_user_create_users');
            expect(callParams['users[0][username]']).toBe('jdoe');
            expect(callParams['users[0][password]']).toBe('Secret123');
            expect(callParams['users[0][firstname]']).toBe('Jane');
            expect(callParams['users[0][lastname]']).toBe('Doe');
            expect(callParams['users[0][email]']).toBe('jane@test.com');
            expect(callParams['users[0][auth]']).toBe('manual');
        });

        it('should return null on API error with exception', async () => {
            mockRequest.post.mockResolvedValue({
                exception: 'moodle_exception',
                errorcode: 'userexists',
                message: 'Username already exists'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.createUser({
                username: 'existing',
                password: 'Pass123!',
                firstname: 'Test',
                lastname: 'User',
                email: 'test@example.com'
            });

            expect(userId).toBeNull();
        });

        it('should return null on API error with errorcode only', async () => {
            mockRequest.post.mockResolvedValue({ errorcode: 'invalidemail' });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.createUser({
                username: 'user',
                password: 'Pass123!',
                firstname: 'Test',
                lastname: 'User',
                email: 'invalid'
            });

            expect(userId).toBeNull();
        });

        it('should return null on empty response array', async () => {
            mockRequest.post.mockResolvedValue([]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.createUser({
                username: 'user',
                password: 'Pass123!',
                firstname: 'Test',
                lastname: 'User',
                email: 'test@example.com'
            });

            expect(userId).toBeNull();
        });

        it('should return null on non-array response', async () => {
            mockRequest.post.mockResolvedValue({ id: 1 }); // Not an array

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.createUser({
                username: 'user',
                password: 'Pass123!',
                firstname: 'Test',
                lastname: 'User',
                email: 'test@example.com'
            });

            expect(userId).toBeNull();
        });
    });

    describe('getOrCreateUser()', () => {
        it('should return existing user with created=false', async () => {
            mockRequest.get.mockResolvedValue({
                users: [{ id: 100, username: 'existinguser' }]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.getOrCreateUser({
                username: 'existinguser',
                password: 'Pass123!',
                firstname: 'Test',
                lastname: 'User',
                email: 'test@example.com'
            });

            expect(result).toEqual({ id: 100, created: false });
            expect(mockRequest.post).not.toHaveBeenCalled(); // Should not try to create
        });

        it('should create new user and return with created=true', async () => {
            mockRequest.get.mockResolvedValue({ users: [] }); // User not found
            mockRequest.post.mockResolvedValue([{ id: 200, username: 'newuser' }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.getOrCreateUser({
                username: 'newuser',
                password: 'Pass123!',
                firstname: 'New',
                lastname: 'User',
                email: 'new@example.com'
            });

            expect(result).toEqual({ id: 200, created: true });
            expect(mockRequest.get).toHaveBeenCalledTimes(1);
            expect(mockRequest.post).toHaveBeenCalledTimes(1);
        });

        it('should return null id when user creation fails', async () => {
            mockRequest.get.mockResolvedValue({ users: [] }); // User not found
            mockRequest.post.mockResolvedValue({
                exception: 'error',
                message: 'Creation failed'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.getOrCreateUser({
                username: 'failuser',
                password: 'Pass123!',
                firstname: 'Fail',
                lastname: 'User',
                email: 'fail@example.com'
            });

            expect(result).toEqual({ id: null, created: true });
        });
    });

    describe('uploadStudents()', () => {
        const sampleStudent = {
            username: 'student1',
            password: 'Pass123!',
            firstname: 'Student',
            lastname: 'One',
            email: 'student1@example.com',
            course: 'MATH101'
        };

        it('should enroll existing students in courses', async () => {
            // Sequence: getUserByUsername (get), getCourseByShortname (get), enrollUsers (post)
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 10 }] }) // student1 exists
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // MATH101 exists
                .mockResolvedValueOnce([]); // no prior enrollments
            mockRequest.post.mockResolvedValue(null); // enrollment success

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.success).toHaveLength(1);
            expect(result.created).toHaveLength(0);
            expect(result.skipped).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should create users that do not exist', async () => {
            // Sequence: getUserByUsername (get, no user), createUser (post), getCourseByShortname (get), enrollUsers (post)
            mockRequest.get
                .mockResolvedValueOnce({ users: [] }) // student1 NOT found
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // MATH101 exists
                .mockResolvedValueOnce([]); // no prior enrollments
            mockRequest.post
                .mockResolvedValueOnce([{ id: 15, username: 'student1' }]) // Create student1
                .mockResolvedValueOnce(null); // enrollment success

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.success).toHaveLength(1);
            expect(result.created).toHaveLength(1);
            expect(result.created[0].student).toBe('student1');
        });

        it('should skip students when course not found', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 10 }] }) // student exists
                .mockResolvedValueOnce({ courses: [] }); // Course NOT found

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.success).toHaveLength(0);
            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toBe('Course not found in Moodle');
        });

        it('should skip students when user creation fails', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getOrCreateUser').mockResolvedValue({ id: null, created: true });
            jest.spyOn(uploader, 'getCourseByShortname').mockResolvedValue(100);
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.success).toHaveLength(0);
            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toBe('Failed to get or create user');
        });

        it('should use course caching to avoid duplicate lookups', async () => {
            const twoStudents = [
                sampleStudent,
                { ...sampleStudent, username: 'student2' }
            ];

            // Two users, one course (cached) + one enrollment lookup per user
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 10 }] }) // student1
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // MATH101 (first lookup)
                .mockResolvedValueOnce([]) // student1 enrolled courses
                .mockResolvedValueOnce({ users: [{ id: 20 }] }) // student2
                .mockResolvedValueOnce([]); // student2 enrolled courses
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadStudents(twoStudents);

            const courseLookups = mockRequest.get.mock.calls.filter(([, query]) => query?.includes('wsfunction=core_course_get_courses_by_field'));
            expect(courseLookups).toHaveLength(1);
        });

        it('should skip students already enrolled in Moodle', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getUserByUsername').mockResolvedValue(10);
            jest.spyOn(uploader, 'getCourseByShortname').mockResolvedValue(100);
            jest.spyOn(uploader, 'getUserEnrolledCourseIds').mockResolvedValue(new Set([100]));
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.success).toHaveLength(0);
            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toBe('Already enrolled in Moodle');
            expect(mockRequest.post).not.toHaveBeenCalled();
        });

        it('should call progress callback during processing', async () => {
            const progressCallback = jest.fn();
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getOrCreateUser').mockResolvedValue({ id: 10, created: false });
            jest.spyOn(uploader, 'getCourseByShortname').mockResolvedValue(100);
            jest.spyOn(uploader, 'getUserEnrolledCourseIds').mockResolvedValue(new Set());
            jest.spyOn(uploader, 'enrollUsers').mockImplementation(async (enrollments, callback) => {
                if (callback) {
                    callback('Enrolling users... 100%');
                }
                return { success: enrollments, errors: [] };
            });
            await uploader.uploadStudents([sampleStudent], progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Processing user 1/1...');
            expect(progressCallback).toHaveBeenCalledWith('Enrolling 1 students...');
            expect(progressCallback).toHaveBeenCalledWith('Enrolling users... 100%');
        });

        it('should handle enrollment API errors', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getOrCreateUser').mockResolvedValue({ id: 10, created: false });
            jest.spyOn(uploader, 'getCourseByShortname').mockResolvedValue(100);
            jest.spyOn(uploader, 'getUserEnrolledCourseIds').mockResolvedValue(new Set());
            jest.spyOn(uploader, 'enrollUsers').mockResolvedValue({
                success: [],
                errors: [{ error: 'Enrollment failed' }]
            });
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toBe('Enrollment failed');
        });

        it('should use STUDENT_ROLE_ID=5 for enrollments', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getOrCreateUser').mockResolvedValue({ id: 10, created: false });
            jest.spyOn(uploader, 'getCourseByShortname').mockResolvedValue(100);
            jest.spyOn(uploader, 'getUserEnrolledCourseIds').mockResolvedValue(new Set());
            const enrollSpy = jest.spyOn(uploader, 'enrollUsers').mockResolvedValue({ success: [{}], errors: [] });
            await uploader.uploadStudents([sampleStudent]);

            expect(enrollSpy).toHaveBeenCalledWith(
                [expect.objectContaining({ roleid: 5 })],
                null
            );
        });

        it('should handle empty students array', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents([]);

            expect(result.success).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
            expect(mockRequest.post).not.toHaveBeenCalled();
        });

        it('should handle course lookup errors as individual errors', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            jest.spyOn(uploader, 'getOrCreateUser').mockResolvedValue({ id: 10, created: false });
            jest.spyOn(uploader, 'getCourseByShortname').mockRejectedValue(new Error('Network error'));
            const result = await uploader.uploadStudents([sampleStudent]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].student).toBe('student1');
            expect(result.errors[0].error).toBe('Network error');
        });
    });

    describe('uploadProfessors()', () => {
        const sampleProfessor = {
            username: 'prof1',
            password: 'Pass123!',
            firstname: 'Professor',
            lastname: 'One',
            email: 'prof1@example.com',
            course: 'MATH101'
        };

        it('should enroll existing professors as teachers', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] }) // prof1 exists
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // MATH101
                .mockResolvedValueOnce([]);
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.success).toHaveLength(1);
            expect(result.created).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should create professors that do not exist', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [] }) // prof1 NOT found
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([]);
            mockRequest.post
                .mockResolvedValueOnce([{ id: 35, username: 'prof1' }]) // Create prof1
                .mockResolvedValueOnce(null); // enrollment

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.success).toHaveLength(1);
            expect(result.created).toHaveLength(1);
            expect(result.created[0].professor).toBe('prof1');
        });

        it('should use TEACHER_ROLE_ID=3 for enrollments', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([]);
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadProfessors([sampleProfessor]);

            // The enrollment is the first (and only) post call
            const [, callParams] = mockRequest.post.mock.calls[0];
            expect(callParams['enrolments[0][roleid]']).toBe(3);
        });

        it('should skip professors when course not found', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [] }); // Course NOT found

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toContain('Course not found in Moodle');
        });

        it('should skip professors when user creation fails', async () => {
            mockRequest.get.mockImplementation((endpoint, queryString) => {
                if (queryString?.includes('wsfunction=core_user_get_users')) {
                    return Promise.resolve({ users: [] });
                }

                if (queryString?.includes('wsfunction=core_course_get_courses_by_field')) {
                    return Promise.resolve({ courses: [{ id: 100 }] });
                }

                return Promise.resolve({});
            });
            mockRequest.post.mockResolvedValueOnce({ exception: 'error', message: 'Creation failed' });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toBe('Failed to get or create user prof1');
        });

        it('should call progress callback during processing', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([]);
            mockRequest.post.mockResolvedValue(null);

            const progressCallback = jest.fn();
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadProfessors([sampleProfessor], progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Processing professor 1/1...');
            expect(progressCallback).toHaveBeenCalledWith('Enrolling 1 professors...');
            expect(progressCallback).toHaveBeenCalledWith('Enrolling users... 100%');
            expect(progressCallback).toHaveBeenCalledTimes(3);
        });

        it('should not call enrollment progress when all professors skipped', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [] }); // Course NOT found - will be skipped

            const progressCallback = jest.fn();
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadProfessors([sampleProfessor], progressCallback);

            // Only processing callback, not enrollment callback
            expect(progressCallback).toHaveBeenCalledTimes(1);
            expect(progressCallback).toHaveBeenCalledWith('Processing professor 1/1...');
        });

        it('should handle empty professors array', async () => {
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([]);

            expect(result.success).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
            expect(mockRequest.post).not.toHaveBeenCalled();
        });

        it('should handle course lookup errors as individual errors', async () => {
            // User found, but course lookup throws
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockRejectedValueOnce(new Error('Connection timeout'));

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].professor).toBe('prof1');
            expect(result.errors[0].error).toBe('Connection timeout');
        });

        it('should handle enrollment API errors', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([]);
            mockRequest.post.mockResolvedValue({
                exception: 'error',
                message: 'Enrollment failed for professor'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toBe('Enrollment failed for professor');
            expect(result.success).toHaveLength(0);
        });

        it('should use user caching across multiple professors', async () => {
            const sameProfTwoCourses = [
                sampleProfessor,
                { ...sampleProfessor, course: 'PHYS101' } // Same prof, different course
            ];

            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] }) // prof1 first lookup
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // MATH101
                .mockResolvedValueOnce([]) // prof1 enrolled courses
                .mockResolvedValueOnce({ courses: [{ id: 200 }] }); // PHYS101
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadProfessors(sameProfTwoCourses);

            // User lookup should be cached (1 user + 2 courses + 1 enrollment lookup)
            expect(mockRequest.get).toHaveBeenCalledTimes(4);
        });

        it('should skip professors already enrolled in Moodle', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 30 }] })
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([{ id: 100, shortname: 'MATH101' }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadProfessors([sampleProfessor]);

            expect(result.success).toHaveLength(0);
            expect(result.skipped).toHaveLength(1);
            expect(result.skipped[0].reason).toBe('Already enrolled in Moodle');
            expect(mockRequest.post).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle special characters in usernames', async () => {
            mockRequest.get.mockResolvedValue({
                users: [{ id: 1, username: 'user.name+test@domain' }]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const userId = await uploader.getUserByUsername('user.name+test@domain');

            expect(userId).toBe(1);
        });

        it('should handle unicode in course names', async () => {
            mockRequest.get.mockResolvedValue({
                courses: [{ id: 1, shortname: 'FÍSICA_101' }]
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const courseId = await uploader.getCourseByShortname('FÍSICA_101');

            expect(courseId).toBe(1);
        });

        it('should handle very long fullnames in uploadCourses', async () => {
            mockRequest.post.mockResolvedValue([{ id: 1 }]);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const longName = 'A'.repeat(500);

            const result = await uploader.uploadCourses([
                { fullname: longName, shortname: 'LONG', category: '1' }
            ]);

            expect(result.success).toHaveLength(1);
        });

        it('should handle progress callback at intervals for many students', async () => {
            // Create 25 students to test modulo 10 progress callback
            const manyStudents = Array.from({ length: 25 }, (_, i) => ({
                username: `student${i}`,
                password: 'P',
                firstname: 'F',
                lastname: 'L',
                email: `s${i}@e.com`,
                course: 'COURSE'
            }));

            mockRequest.get.mockImplementation((endpoint, queryString) => {
                if (queryString?.includes('wsfunction=core_user_get_users')) {
                    return Promise.resolve({ users: [{ id: 1 }] });
                }
                return Promise.resolve({ courses: [{ id: 100 }] });
            });
            mockRequest.post.mockResolvedValue(null);

            const progressCallback = jest.fn();
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadStudents(manyStudents, progressCallback);

            // Should be called at 1, 11, 21 (every 10th starting from 0)
            expect(progressCallback).toHaveBeenCalledWith('Processing user 1/25...');
            expect(progressCallback).toHaveBeenCalledWith('Processing user 11/25...');
            expect(progressCallback).toHaveBeenCalledWith('Processing user 21/25...');
        });

        it('should handle user caching with same username different courses', async () => {
            const students = [
                { username: 'same', password: 'P', firstname: 'F', lastname: 'L', email: 'e@e.com', course: 'C1' },
                { username: 'same', password: 'P', firstname: 'F', lastname: 'L', email: 'e@e.com', course: 'C2' }
            ];

            mockRequest.get.mockImplementation((endpoint, queryString) => {
                if (queryString?.includes('wsfunction=core_user_get_users')) {
                    return Promise.resolve({ users: [{ id: 10 }] });
                }

                if (queryString?.includes('wsfunction=core_course_get_courses_by_field')) {
                    if (queryString.includes('value=C1')) {
                        return Promise.resolve({ courses: [{ id: 100 }] });
                    }
                    if (queryString.includes('value=C2')) {
                        return Promise.resolve({ courses: [{ id: 200 }] });
                    }
                    return Promise.resolve({ courses: [] });
                }

                if (queryString?.includes('wsfunction=core_enrol_get_users_courses')) {
                    return Promise.resolve([]);
                }

                return Promise.resolve({});
            });
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents(students);

            expect(result.success).toHaveLength(2);
            const userLookups = mockRequest.get.mock.calls.filter(([, query]) => query?.includes('wsfunction=core_user_get_users'));
            expect(userLookups).toHaveLength(1);
        });

        it('should handle mixed success and failure in student upload', async () => {
            const students = [
                { username: 's1', password: 'P', firstname: 'F', lastname: 'L', email: 'e1@e.com', course: 'C1' },
                { username: 's2', password: 'P', firstname: 'F', lastname: 'L', email: 'e2@e.com', course: 'C2' }, // course not found
                { username: 's3', password: 'P', firstname: 'F', lastname: 'L', email: 'e3@e.com', course: 'C1' }  // success
            ];

            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 1 }] }) // s1 found
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // C1 found
                .mockResolvedValueOnce({ users: [{ id: 2 }] }) // s2 found
                .mockResolvedValueOnce({ courses: [] }) // C2 NOT found
                .mockResolvedValueOnce({ users: [{ id: 3 }] }); // s3 found (C1 cached)
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents(students);

            expect(result.success).toHaveLength(2); // s1 and s3
            expect(result.skipped).toHaveLength(1); // s2 (course not found)
            expect(result.skipped[0].student).toBe('s2');
        });

        it('should handle mixed created and existing users', async () => {
            const students = [
                { username: 's1', password: 'P', firstname: 'F', lastname: 'L', email: 'e1@e.com', course: 'C1' }, // existing
                { username: 's2', password: 'P', firstname: 'F', lastname: 'L', email: 'e2@e.com', course: 'C1' }  // needs creation
            ];

            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 1 }] }) // s1 found
                .mockResolvedValueOnce({ courses: [{ id: 100 }] }) // C1 found
                .mockResolvedValueOnce({ users: [] }); // s2 NOT found
            mockRequest.post
                .mockResolvedValueOnce([{ id: 2, username: 's2' }]) // s2 created
                .mockResolvedValueOnce(null); // enrollment

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadStudents(students);

            expect(result.success).toHaveLength(2);
            expect(result.created).toHaveLength(1);
            expect(result.created[0].student).toBe('s2');
        });

        it('should handle progress callback at intervals for many professors', async () => {
            const manyProfessors = Array.from({ length: 22 }, (_, i) => ({
                username: `prof${i}`,
                password: 'P',
                firstname: 'F',
                lastname: 'L',
                email: `p${i}@e.com`,
                course: 'COURSE'
            }));

            mockRequest.get.mockImplementation((endpoint, queryString) => {
                if (queryString?.includes('wsfunction=core_user_get_users')) {
                    return Promise.resolve({ users: [{ id: 1 }] });
                }
                return Promise.resolve({ courses: [{ id: 100 }] });
            });
            mockRequest.post.mockResolvedValue(null);

            const progressCallback = jest.fn();
            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await uploader.uploadProfessors(manyProfessors, progressCallback);

            // Should be called at 1, 11, 21 (every 10th starting from 0)
            expect(progressCallback).toHaveBeenCalledWith('Processing professor 1/22...');
            expect(progressCallback).toHaveBeenCalledWith('Processing professor 11/22...');
            expect(progressCallback).toHaveBeenCalledWith('Processing professor 21/22...');
        });

        it('should handle null progressCallback gracefully', async () => {
            mockRequest.get
                .mockResolvedValueOnce({ users: [{ id: 10 }] })
                .mockResolvedValueOnce({ courses: [{ id: 100 }] })
                .mockResolvedValueOnce([]);
            mockRequest.post.mockResolvedValue(null);

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            
            // Should not throw when progressCallback is null
            const result = await uploader.uploadStudents([
                { username: 's1', password: 'P', firstname: 'F', lastname: 'L', email: 'e@e.com', course: 'C1' }
            ], null);

            expect(result.success).toHaveLength(1);
        });

        it('should handle enrollUsers with exception but no message', async () => {
            mockRequest.post.mockResolvedValue({
                exception: 'some_exception',
                errorcode: 'error123'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.enrollUsers([{ userid: 1, courseid: 1, roleid: 5 }]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toBe('some_exception'); // Falls back to exception
        });

        it('should handle uploadCourses with exception but no message', async () => {
            mockRequest.post.mockResolvedValue({
                exception: 'course_exception',
                errorcode: 'course123'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.uploadCourses([
                { fullname: 'Test', shortname: 'T', category: '1' }
            ]);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toBe('course_exception');
        });

        it('should return empty enrolled course set when response is not an array', async () => {
            mockRequest.get.mockResolvedValue({ not: 'array' });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            const result = await uploader.getUserEnrolledCourseIds(10);

            expect(result).toEqual(new Set());
        });

        it('should throw when enrollment lookup returns API error payload', async () => {
            mockRequest.get.mockResolvedValue({
                exception: 'moodle_exception',
                message: 'Failed lookup'
            });

            const uploader = new MoodleUploader('https://moodle.example.com', 'test-token');
            await expect(uploader.getUserEnrolledCourseIds(10)).rejects.toThrow('Failed lookup');
        });
    });
});
