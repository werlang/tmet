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
        const results = {
            success: [],
            errors: []
        };

        console.log(`Uploading ${courses.length} courses to Moodle...`);

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            
            if (progressCallback) {
                progressCallback(`Uploading course ${i + 1}/${courses.length}: ${course.shortname}`);
            }
            
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

        // Failsafe: block API calls outside production
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV MODE] Moodle API call blocked. Params: ${params}`);
            return { skipped: true, reason: 'development mode' };
        }
        const response = await Request.post(`${this.webserviceUrl}?${params}`);
        console.log(response);
    }

}