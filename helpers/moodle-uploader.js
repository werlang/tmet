import { Request } from './request.js';
import { RequestWindow } from './request-window.js';

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
        console.log(`Preparing to upload ${courses.length} courses in batches...`);

        const BATCH_SIZE = 1; // Must be 1 or a single fail will nullify the whole batch, and Moodle doesn't support partial success responses for course creation
        const WINDOW_SIZE = 1;
        const results = { success: [], errors: [] };
        const totalBatches = Math.ceil(courses.length / BATCH_SIZE);

        if (courses.length === 0) {
            return results;
        }

        let processedCourses = 0;
        const requestWindow = new RequestWindow(WINDOW_SIZE);
        const taskFactories = [];

        for (let i = 0; i < courses.length; i += BATCH_SIZE) {
            const batch = courses.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

            taskFactories.push(async () => {
                const params = {
                    wstoken: this.token,
                    wsfunction: 'core_course_create_courses',
                    moodlewsrestformat: 'json',
                };

                batch.forEach((course, index) => {
                    params[`courses[${index}][fullname]`] = course.fullname;
                    params[`courses[${index}][shortname]`] = course.shortname;
                    params[`courses[${index}][categoryid]`] = course.category;
                });

                try {
                    const response = await new Request({
                        url: this.baseUrl,
                        format: 'form'
                    }).post(this.webserviceUrl, params);

                    if (response?.exception || response?.errorcode) {
                        results.errors.push({
                            batch: batchNumber,
                            error: response.message || response.exception,
                            courses: batch.map(c => c.shortname),
                        });
                    } else if (Array.isArray(response)) {
                        results.success.push(...response);
                    }

                    processedCourses += batch.length;
                    if (progressCallback) {
                        const progress = Math.min(100, Math.round((processedCourses / courses.length) * 100));
                        progressCallback(`Uploading courses... ${progress}%`);
                    }

                    console.log(`Batch ${batchNumber}/${totalBatches} processed: ${results.success.length} success, ${results.errors.length} errors so far.`);
                } catch (error) {
                    results.errors.push({ batch: batchNumber, error: error.message });
                }
            });
        }

        await requestWindow.run(taskFactories);

        // remove errors meaning course already exists
        const originalErrorCount = results.errors.length;
        results.errors = results.errors.filter(error => error.error && !error.error.toLowerCase().includes('nome breve já é usado em um outro curso'));
        const filteredErrorCount = results.errors.length;

        console.log(`Course upload complete: ${results.success.length} uploaded, ${originalErrorCount - filteredErrorCount} already existed, ${filteredErrorCount} other errors.`);
        results.errors.forEach(error => {
            console.log(error);
        });

        return results;
    }

    /**
     * Enroll users in courses via Moodle Web Service API
     * @param {Array} enrollments - Array of enrollment objects with courseid, userid, roleid
     * @param {Function} progressCallback - Optional callback for progress updates
     */
    async enrollUsers(enrollments, progressCallback = null) {
        console.log(`Preparing to enroll ${enrollments.length} users in batches...`);

        const BATCH_SIZE = 1;
        const WINDOW_SIZE = 10;
        const results = { success: [], errors: [] };
        const totalBatches = Math.ceil(enrollments.length / BATCH_SIZE);
        const requestWindow = new RequestWindow(WINDOW_SIZE);
        let processedEnrollments = 0;
        const taskFactories = [];

        for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
            const batch = enrollments.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const params = {
                wstoken: this.token,
                wsfunction: 'enrol_manual_enrol_users',
                moodlewsrestformat: 'json',
            };

            batch.forEach((enrol, index) => {
                params[`enrolments[${index}][roleid]`] = enrol.roleid;
                params[`enrolments[${index}][userid]`] = enrol.userid;
                params[`enrolments[${index}][courseid]`] = enrol.courseid;
            });

            taskFactories.push(async () => {
                try {
                    const response = await new Request({ url: this.baseUrl, format: 'form' }).post(this.webserviceUrl, params);

                    // enrol_manual_enrol_users returns null on success
                    if (response?.exception || response?.errorcode) {
                        results.errors.push({
                            user: 'all',
                            batch: batchNumber,
                            error: response.message || response.exception,
                        });
                    } else {
                        results.success.push(...batch);
                    }

                    processedEnrollments += batch.length;
                    if (progressCallback) {
                        const progress = Math.min(100, Math.round((processedEnrollments / enrollments.length) * 100));
                        progressCallback(`Enrolling users... ${progress}%`);
                    }

                    console.log(`Batch ${batchNumber}/${totalBatches} processed: ${results.success.length} success, ${results.errors.length} errors so far.`);
                } catch (error) {
                    results.errors.push({ user: 'all', batch: batchNumber, error: error.message });
                }
            });
        }

        await requestWindow.run(taskFactories);
        return results;
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
     * Get all course IDs a user is already enrolled in
     * @param {number|string} userId - Moodle user ID
     * @returns {Promise<Set<number>>} Set of enrolled course IDs
     */
    async getUserEnrolledCourseIds(userId) {
        const params = new URLSearchParams({
            wstoken: this.token,
            wsfunction: 'core_enrol_get_users_courses',
            moodlewsrestformat: 'json',
            userid: String(userId),
        }).toString();

        const response = await new Request({ url: this.baseUrl }).get(this.webserviceUrl, params);
        if (response?.exception || response?.errorcode) {
            throw new Error(response.message || response.exception || 'Failed to fetch user enrollments');
        }

        if (!Array.isArray(response)) {
            return new Set();
        }

        return new Set(
            response
                .map(course => Number(course?.id))
                .filter(courseId => Number.isFinite(courseId))
        );
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

        // Promise-based caches for parallel lookups
        const userCache = new Map();
        const courseCache = new Map();
        const enrollmentCache = new Map();
        const createdUsers = new Set();
        const enrollments = [];

        // Student role ID in Moodle is typically 5
        const STUDENT_ROLE_ID = 5;

        const PREP_WINDOW_SIZE = 10;
        const prepWindow = new RequestWindow(PREP_WINDOW_SIZE, { timeoutMs: 60000 });
        const prepared = new Array(students.length);
        const prepTasks = students.map((student, i) => async () => {
            if (progressCallback && i % 10 === 0) {
                progressCallback(`Processing user ${i + 1}/${students.length}...`);
            }

            try {
                if (!userCache.has(student.username)) {
                    userCache.set(student.username, this.getOrCreateUser(student));
                }

                if (!courseCache.has(student.course)) {
                    courseCache.set(student.course, this.getCourseByShortname(student.course));
                }

                const [userResult, rawCourseId] = await Promise.all([
                    userCache.get(student.username),
                    courseCache.get(student.course),
                ]);

                const userId = userResult?.id;
                if (!userId) {
                    prepared[i] = { type: 'skipped', payload: { student: student.username, reason: 'Failed to get or create user' } };
                    return;
                }

                if (userResult.created && !createdUsers.has(student.username)) {
                    createdUsers.add(student.username);
                    results.created.push({ student: student.username });
                }

                const courseId = Number(rawCourseId);
                if (!Number.isFinite(courseId) || courseId <= 0) {
                    prepared[i] = { type: 'skipped', payload: { student: student.username, course: student.course, reason: 'Course not found in Moodle' } };
                    return;
                }

                if (!enrollmentCache.has(userId)) {
                    enrollmentCache.set(userId, this.getUserEnrolledCourseIds(userId));
                }

                const enrolledCourseIds = await enrollmentCache.get(userId);
                if (enrolledCourseIds.has(courseId)) {
                    prepared[i] = {
                        type: 'skipped', payload: { student: student.username, course: student.course, reason: 'Already enrolled in Moodle' } };
                    return;
                }

                enrolledCourseIds.add(courseId);

                prepared[i] = {
                    type: 'enrollment',
                    payload: {
                        userid: userId,
                        courseid: courseId,
                        roleid: STUDENT_ROLE_ID,
                    }
                };
            } catch (error) {
                prepared[i] = {
                    type: 'error', payload: {
                        student: student.username,
                        error: error.message
                    }
                };
                console.error(`Error processing student ${student.username} for course ${student.course}:`, error);
            }
        });

        await prepWindow.run(prepTasks);

        prepared.forEach(item => {
            if (!item) {
                return;
            }

            if (item.type === 'enrollment') {
                enrollments.push(item.payload);
            } else if (item.type === 'skipped') {
                results.skipped.push(item.payload);
            } else if (item.type === 'error') {
                results.errors.push(item.payload);
            }
        });

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

        console.log(`Enrollment complete: ${results.success.length} enrolled, ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors.`);
        results.errors.forEach(error => {
            console.log(error);
        });
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

        // Promise-based caches for parallel lookups
        const userCache = new Map();
        const courseCache = new Map();
        const enrollmentCache = new Map();
        const createdProfessors = new Set();
        const enrollments = [];

        // Editing teacher role ID in Moodle is typically 3
        const TEACHER_ROLE_ID = 3;

        const PREP_WINDOW_SIZE = 10;
        const prepWindow = new RequestWindow(PREP_WINDOW_SIZE);
        const prepared = new Array(professors.length);
        const prepTasks = professors.map((professor, i) => async () => {
            if (progressCallback && i % 10 === 0) {
                progressCallback(`Processing professor ${i + 1}/${professors.length}...`);
            }

            try {
                if (!userCache.has(professor.username)) {
                    userCache.set(professor.username, this.getOrCreateUser(professor));
                }

                if (!courseCache.has(professor.course)) {
                    courseCache.set(professor.course, this.getCourseByShortname(professor.course));
                }

                const [userResult, rawCourseId] = await Promise.all([
                    userCache.get(professor.username),
                    courseCache.get(professor.course),
                ]);

                const userId = userResult?.id;
                if (!userId) {
                    prepared[i] = {
                        type: 'skipped', payload: {
                            professor: professor.username,
                            reason: `Failed to get or create user ${professor.username}`
                        }
                    };
                    return;
                }

                if (userResult.created && !createdProfessors.has(professor.username)) {
                    createdProfessors.add(professor.username);
                    results.created.push({ professor: professor.username });
                }

                const courseId = Number(rawCourseId);
                if (!Number.isFinite(courseId) || courseId <= 0) {
                    console.log(`Course not found for professor ${professor.username}: ${professor.course}`);
                    prepared[i] = { type: 'skipped', payload: {
                        professor: professor.username,
                        course: professor.course,
                        reason: `Course not found in Moodle: ${professor.course}`
                    } };
                    return;
                }

                if (!enrollmentCache.has(userId)) {
                    enrollmentCache.set(userId, this.getUserEnrolledCourseIds(userId));
                }

                const enrolledCourseIds = await enrollmentCache.get(userId);
                if (enrolledCourseIds.has(courseId)) {
                    prepared[i] = {
                        type: 'skipped', payload: {
                            professor: professor.username,
                            course: professor.course,
                            reason: 'Already enrolled in Moodle'
                        }
                    };
                    return;
                }

                enrolledCourseIds.add(courseId);

                prepared[i] = {
                    type: 'enrollment',
                    payload: {
                        userid: userId,
                        courseid: courseId,
                        roleid: TEACHER_ROLE_ID,
                    }
                };
            } catch (error) {
                prepared[i] = { type: 'error', payload: {
                    professor: professor.username,
                    course: professor.course,
                    error: error.message
                } };
                console.log(`Error processing professor ${professor.username} for course ${professor.course}:`, error);
            }
        });

        await prepWindow.run(prepTasks);

        prepared.forEach(item => {
            if (!item) {
                return;
            }

            if (item.type === 'enrollment') {
                enrollments.push(item.payload);
            } else if (item.type === 'skipped') {
                results.skipped.push(item.payload);
            } else if (item.type === 'error') {
                results.errors.push(item.payload);
            }
        });

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
        results.errors.forEach(error => {
            console.log(error);
        });
        return results;
    }

}

export { MoodleUploader };