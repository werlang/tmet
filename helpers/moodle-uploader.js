import Request from './request.js';

export default class MoodleUploader {
    constructor(moodleUrl, token) {
        this.baseUrl = moodleUrl.replace(/\/$/, '');
        this.token = token;
        this.webserviceUrl = `${this.baseUrl}/webservice/rest/server.php`;
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

        const response = await Request.post(`${this.webserviceUrl}?${new URLSearchParams(params).toString()}`);
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

        const response = await Request.post(`${this.webserviceUrl}?${new URLSearchParams(params).toString()}`);
        console.log(response);

        // Handle Moodle API error response
        if (response.exception || response.errorcode) {
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

        const response = await Request.get(`${this.webserviceUrl}?${params}`);
        
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

        const response = await Request.get(`${this.webserviceUrl}?${params}`);
        
        if (response.courses && response.courses.length > 0) {
            return response.courses[0].id;
        }
        return null;
    }

    /**
     * Upload students to Moodle - looks up users and courses, then enrolls them
     * @param {Array} students - Array of student objects with username, course (shortname)
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result with success and errors arrays
     */
    async uploadStudents(students, progressCallback = null) {
        console.log(`Processing ${students.length} student enrollments...`);
        
        const results = {
            success: [],
            errors: [],
            skipped: []
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
                progressCallback(`Looking up user ${i + 1}/${students.length}...`);
            }

            try {
                // Get user ID (with caching)
                if (!userCache[student.username]) {
                    userCache[student.username] = await this.getUserByUsername(student.username);
                }
                const userId = userCache[student.username];

                if (!userId) {
                    results.skipped.push({ student: student.username, reason: 'User not found in Moodle' });
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

        console.log(`Enrollment complete: ${results.success.length} enrolled, ${results.skipped.length} skipped, ${results.errors.length} errors`);
        return results;
    }

    /**
     * Upload professors to Moodle - looks up users and courses, then enrolls them as teachers
     * @param {Array} professors - Array of professor objects with username, course (shortname)
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Result with success and errors arrays
     */
    async uploadProfessors(professors, progressCallback = null) {
        console.log(`Processing ${professors.length} professor enrollments...`);
        
        const results = {
            success: [],
            errors: [],
            skipped: []
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
                progressCallback(`Looking up professor ${i + 1}/${professors.length}...`);
            }

            try {
                // Get user ID (with caching)
                if (!userCache[professor.username]) {
                    userCache[professor.username] = await this.getUserByUsername(professor.username);
                }
                const userId = userCache[professor.username];

                if (!userId) {
                    results.skipped.push({ professor: professor.username, reason: 'User not found in Moodle' });
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

        console.log(`Enrollment complete: ${results.success.length} enrolled, ${results.skipped.length} skipped, ${results.errors.length} errors`);
        return results;
    }

}