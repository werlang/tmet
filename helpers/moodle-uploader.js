import { Request } from './request.js';

class MoodleUploader {
    constructor(moodleUrl, token) {
        this.baseUrl = moodleUrl.replace(/\/$/, '');
        this.token = token;
        this.webserviceUrl = `/webservice/rest/server.php`;
    }

    /**
     * Upload courses via Moodle Web Service API
     * @param {Array} courses - Array of course objects with fullname, shortname, categoryid
     * @param {Function} progressCallback - Optional callback for progress updates
     */
    async uploadCourses(courses, progressCallback = null) {
        console.log(`Uploading ${courses.length} courses to Moodle...`);

        const params = {
            wstoken: this.token,
            wsfunction: 'core_course_create_courses',
            moodlewsrestformat: 'json',
        };

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            
            params[`courses[${i}][fullname]`] = course.fullname;
            params[`courses[${i}][shortname]`] = course.shortname;
            params[`courses[${i}][categoryid]`] = course.category;   
        }

        const response = await new Request({ url: this.baseUrl, format: 'form' }).post(this.webserviceUrl, params);
        console.log(response);

        // Handle Moodle API error response
        if (response.exception || response.errorcode) {
            return {
                success: [],
                errors: [{ course: 'all', error: response.message || response.exception }]
            };
        }

        // Moodle returns array of created courses on success
        return {
            success: Array.isArray(response) ? response : [],
            errors: []
        };
    }

    /**
     * Enroll users in courses via Moodle Web Service API
     * @param {Array} enrollments - Array of enrollment objects with courseid, userid, roleid
     * @param {Function} progressCallback - Optional callback for progress updates
     */
    async enrollUsers(enrollments, progressCallback = null) {
        console.log(`Enrolling ${enrollments.length} users in courses...`);

        const params = {
            wstoken: this.token,
            wsfunction: 'enrol_manual_enrol_users',
            moodlewsrestformat: 'json',
        };

        for (let i = 0; i < enrollments.length; i++) {
            const enrol = enrollments[i];
            
            params[`enrolments[${i}][roleid]`] = enrol.roleid;
            params[`enrolments[${i}][userid]`] = enrol.userid;
            params[`enrolments[${i}][courseid]`] = enrol.courseid;
        }

        const response = await new Request({ url: this.baseUrl, format: 'form' }).post(this.webserviceUrl, params);
        console.log(response);

        // Handle Moodle API error response
        if (response?.exception || response?.errorcode) {
            return {
                success: [],
                errors: [{ user: 'all', error: response.message || response.exception }]
            };
        }

        // enrol_manual_enrol_users returns null on success
        return {
            success: enrollments,
            errors: []
        };
    }

    /**
     * Get user ID by username
     * @param {string} username - Username to look up
     * @returns {Promise<number|null>} User ID or null if not found
     */
    async getUserByUsername(username) {
        const params = new URLSearchParams({
            wstoken: this.token,
            wsfunction: 'core_user_get_users',
            moodlewsrestformat: 'json',
            'criteria[0][key]': 'username',
            'criteria[0][value]': username,
        }).toString();

        const response = await new Request({ url: this.baseUrl }).get(this.webserviceUrl, params);
        
        if (response.users && response.users.length > 0) {
            return response.users[0].id;
        }
        return null;
    }

    /**
     * Get course ID by shortname
     * @param {string} shortname - Course shortname
     * @returns {Promise<number|null>} Course ID or null if not found
     */
    async getCourseByShortname(shortname) {
        const params = new URLSearchParams({
            wstoken: this.token,
            wsfunction: 'core_course_get_courses_by_field',
            moodlewsrestformat: 'json',
            field: 'shortname',
            value: shortname,
        }).toString();

        const response = await new Request({ url: this.baseUrl }).get(this.webserviceUrl, params);
        // console.log(response);
        
        if (response.courses && response.courses.length > 0) {
            return response.courses[0].id;
        }
        return null;
    }

    /**
     * Create a new user in Moodle
     * @param {Object} user - User object with username, password, firstname, lastname, email
     * @returns {Promise<number|null>} User ID or null if creation failed
     */
    async createUser(user) {
        const params = {
            wstoken: this.token,
            wsfunction: 'core_user_create_users',
            moodlewsrestformat: 'json',
            'users[0][username]': user.username,
            'users[0][password]': user.password,
            'users[0][firstname]': user.firstname,
            'users[0][lastname]': user.lastname,
            'users[0][email]': user.email,
            'users[0][auth]': 'manual',
        };

        const response = await new Request({ url: this.baseUrl, format: 'form' }).post(this.webserviceUrl, params);
        
        if (response.exception || response.errorcode) {
            console.error(`Failed to create user ${user.username}:`, response.message || response.exception);
            return null;
        }

        // Response is array of created users with their IDs
        if (Array.isArray(response) && response.length > 0) {
            console.log(`Created user ${user.username} with ID ${response[0].id}`);
            return response[0].id;
        }
        return null;
    }

    /**
     * Get or create user - looks up user, creates if not found
     * @param {Object} user - User object with username, password, firstname, lastname, email
     * @returns {Promise<{id: number|null, created: boolean}>} User ID and whether it was created
     */
    async getOrCreateUser(user) {
        // First try to find existing user
        let userId = await this.getUserByUsername(user.username);
        
        if (userId) {
            return { id: userId, created: false };
        }

        // User not found, create them
        userId = await this.createUser(user);
        return { id: userId, created: true };
    }

    /**
     * Upload students to Moodle - looks up users (creates if needed) and courses, then enrolls them
     * @param {Array} students - Array of student objects with username, password, firstname, lastname, email, course
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result with success, errors, skipped, and created arrays
     */
    async uploadStudents(students, progressCallback = null) {
        console.log(`Processing ${students.length} student enrollments...`);
        
        const results = {
            success: [],
            errors: [],
            skipped: [],
            created: []
        };

        // Cache for user and course lookups
        const userCache = {};
        const courseCache = {};
        const enrollments = [];

        // Student role ID in Moodle is typically 5
        const STUDENT_ROLE_ID = 5;

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            
            if (progressCallback && i % 10 === 0) {
                progressCallback(`Processing user ${i + 1}/${students.length}...`);
            }

            try {
                // Get or create user (with caching)
                if (!userCache[student.username]) {
                    const userResult = await this.getOrCreateUser(student);
                    userCache[student.username] = userResult.id;
                    if (userResult.created && userResult.id) {
                        results.created.push({ student: student.username });
                    }
                }
                const userId = userCache[student.username];

                if (!userId) {
                    results.skipped.push({ student: student.username, reason: 'Failed to get or create user' });
                    continue;
                }

                // Get course ID (with caching)
                if (!courseCache[student.course]) {
                    courseCache[student.course] = await this.getCourseByShortname(student.course);
                }
                const courseId = courseCache[student.course];

                if (!courseId) {
                    results.skipped.push({ student: student.username, course: student.course, reason: 'Course not found in Moodle' });
                    continue;
                }

                enrollments.push({
                    userid: userId,
                    courseid: courseId,
                    roleid: STUDENT_ROLE_ID
                });

            } catch (error) {
                results.errors.push({ student: student.username, error: error.message });
            }
        }

        // Batch enroll all users
        if (enrollments.length > 0) {
            if (progressCallback) {
                progressCallback(`Enrolling ${enrollments.length} students...`);
            }

            const enrollResult = await this.enrollUsers(enrollments, progressCallback);
            
            if (enrollResult.errors.length > 0) {
                results.errors.push(...enrollResult.errors);
            } else {
                results.success = enrollments;
            }
        }

        console.log(`Enrollment complete: ${results.success.length} enrolled, ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`);
        return results;
    }

    /**
     * Upload professors to Moodle - looks up users (creates if needed) and courses, then enrolls them as teachers
     * @param {Array} professors - Array of professor objects with username, password, firstname, lastname, email, course
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result with success, errors, skipped, and created arrays
     */
    async uploadProfessors(professors, progressCallback = null) {
        console.log(`Processing ${professors.length} professor enrollments...`);
        
        const results = {
            success: [],
            errors: [],
            skipped: [],
            created: []
        };

        // Cache for user and course lookups
        const userCache = {};
        const courseCache = {};
        const enrollments = [];

        // Editing teacher role ID in Moodle is typically 3
        const TEACHER_ROLE_ID = 3;

        for (let i = 0; i < professors.length; i++) {
            const professor = professors[i];
            
            if (progressCallback && i % 10 === 0) {
                progressCallback(`Processing professor ${i + 1}/${professors.length}...`);
            }

            try {
                // Get or create user (with caching)
                if (!userCache[professor.username]) {
                    const userResult = await this.getOrCreateUser(professor);
                    userCache[professor.username] = userResult.id;
                    if (userResult.created && userResult.id) {
                        results.created.push({ professor: professor.username });
                    }
                }
                const userId = userCache[professor.username];

                if (!userId) {
                    results.skipped.push({ professor: professor.username, reason: 'Failed to get or create user' });
                    continue;
                }

                // Get course ID (with caching)
                if (!courseCache[professor.course]) {
                    courseCache[professor.course] = await this.getCourseByShortname(professor.course);
                }
                const courseId = courseCache[professor.course];

                if (!courseId) {
                    results.skipped.push({ professor: professor.username, course: professor.course, reason: 'Course not found in Moodle' });
                    continue;
                }

                enrollments.push({
                    userid: userId,
                    courseid: courseId,
                    roleid: TEACHER_ROLE_ID
                });

            } catch (error) {
                results.errors.push({ professor: professor.username, error: error.message });
            }
        }

        // Batch enroll all professors
        if (enrollments.length > 0) {
            if (progressCallback) {
                progressCallback(`Enrolling ${enrollments.length} professors...`);
            }

            const enrollResult = await this.enrollUsers(enrollments, progressCallback);
            
            if (enrollResult.errors.length > 0) {
                results.errors.push(...enrollResult.errors);
            } else {
                results.success = enrollments;
            }
        }

        console.log(`Enrollment complete: ${results.success.length} enrolled, ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`);
        return results;
    }

}

export { MoodleUploader };