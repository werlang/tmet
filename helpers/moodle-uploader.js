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
     */
    async uploadCourses(courses) {
        const results = {
            success: [],
            errors: []
        };

        console.log(`Uploading ${courses.length} courses to Moodle...`);

        for (const course of courses) {
            try {
                const response = await this.createCourse(course);
                results.success.push(response);
                console.log(`✓ Created: ${course.shortname}`);
            } catch (error) {
                results.errors.push({
                    course: course.shortname,
                    error: error.message
                });
                console.error(`✗ Failed: ${course.shortname} - ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Create a single course via API
     */
    async createCourse(course) {
        const params = new URLSearchParams({
            wstoken: this.token,
            wsfunction: 'core_course_create_courses',
            moodlewsrestformat: 'json',
            'courses[0][fullname]': course.fullname,
            'courses[0][shortname]': course.shortname,
            'courses[0][categoryid]': course.category,
        }).toString();

        const response = await Request.post(`${this.webserviceUrl}?${params}`);
        console.log(response);
    }

}