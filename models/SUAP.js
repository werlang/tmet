import path from 'path';
import fs from 'fs';
import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../config/suap-config.js';

/**
 * SUAP Model
 * Handles SUAP extraction operations
 */
export default class SUAP {
    #dataPath;

    constructor() {
        this.#dataPath = path.resolve('files', 'suap_subjects.json');
    }

    /**
     * Extract subjects from SUAP
     * @param {Object} options - Extraction options
     * @param {number} options.year - Year
     * @param {number} options.semester - Semester
     * @param {string[]} options.courses - Course codes to extract
     * @returns {Promise<Array>} Extracted subjects
     */
    async extractSubjects({ year, semester, courses }) {
        const scraper = new SUAPScraper();
        const subjects = [];

        try {
            await scraper.launch();

            // Navigate to SUAP course book
            const url = suapConfig.buildURL(year, semester);
            await scraper.goto(url);

            // Login if needed
            if (await scraper.hasElement(suapConfig.selectors.loginForm)) {
                await this.#login(scraper);
            }

            // Extract subjects for each course
            const coursesToExtract = courses && courses.length > 0 
                ? courses 
                : suapConfig.defaultCourses;

            for (const courseCode of coursesToExtract) {
                const courseSubjects = await this.#extractCourse(scraper, courseCode, year, semester);
                subjects.push(...courseSubjects);
            }

        } finally {
            await scraper.close();
        }

        // Save to file
        this.#saveSubjects(subjects);

        return subjects;
    }

    /**
     * Login to SUAP
     * @private
     */
    async #login(scraper) {
        const username = process.env.SUAP_USERNAME;
        const password = process.env.SUAP_PASSWORD;

        if (!username || !password) {
            throw new Error('SUAP credentials not configured');
        }

        await scraper.type(suapConfig.selectors.usernameInput, username);
        await scraper.type(suapConfig.selectors.passwordInput, password);
        await scraper.click(suapConfig.selectors.loginButton);
        await scraper.waitForNavigation();
    }

    /**
     * Extract subjects for a specific course
     * @private
     */
    async #extractCourse(scraper, courseCode, year, semester) {
        const subjects = [];

        // Select course
        await scraper.select(suapConfig.selectors.courseSelect, courseCode);
        await scraper.waitFor(1000); // Wait for page update

        // Get all subject rows
        const rows = await scraper.querySelectorAll(suapConfig.selectors.subjectRow);

        for (const row of rows) {
            const id = await scraper.getAttribute(row, 'data-id');
            const subjectName = await scraper.textContent(row, suapConfig.selectors.subjectName);
            const className = await scraper.textContent(row, suapConfig.selectors.className);

            if (id && subjectName && className) {
                subjects.push({
                    id,
                    subjectName: subjectName.trim(),
                    className: className.trim(),
                    fullname: `${className.trim()} - ${subjectName.trim()}`,
                    courseCode,
                    year,
                    semester
                });
            }
        }

        return subjects;
    }

    /**
     * Save subjects to file
     * @private
     */
    #saveSubjects(subjects) {
        fs.writeFileSync(this.#dataPath, JSON.stringify(subjects, null, 2));
    }
}
