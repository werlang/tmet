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
     * Upload users via Moodle Web Service API
     * @param {Array} users - Array of user objects with username, password, firstname, lastname, email, course1, role1
     */
    async uploadUsers(users) {
        console.log(`Uploading ${users.length} users to Moodle...`);

        const params = {
            wstoken: this.token,
            wsfunction: 'core_user_create_users',
            moodlewsrestformat: 'json',
        };

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            
            params[`users[${i}][username]`] = user.username;
            params[`users[${i}][password]`] = user.password;
            params[`users[${i}][firstname]`] = user.firstname;
            params[`users[${i}][lastname]`] = user.lastname;
            params[`users[${i}][email]`] = user.email;
            params[`users[${i}][course1]`] = user.course1;
            params[`users[${i}][role1]`] = user.role1;   
        }

        const response = await Request.post(`${this.webserviceUrl}?${new URLSearchParams(params).toString()}`);
        console.log(response);

        return response;
    }

}