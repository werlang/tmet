import path from 'path';
import fs from 'fs';
import extractSUAP from '../modules/extract-suap.js';
import SUAPScraper from '../helpers/scraper.js';
import suapConfig from '../config/suap-config.js';

/**
 * SUAP Model
 * Handles SUAP extraction operations
 */
export default class SUAP {
    #dataPath;
    #studentsPath;

    constructor() {
        this.#dataPath = path.resolve('files', 'suap_subjects.json');
        this.#studentsPath = path.resolve('files', 'suap_students.json');
    }

    /**
     * Extract subjects from SUAP
     * @param {Object} options - Extraction options
     * @param {number} options.year - Year
     * @param {number} options.semester - Semester
     * @param {string[]} options.courses - Course codes to extract
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Array>} Extracted subjects
     */
    async extractSubjects({ year, semester, courses: selectedCourses }, progressCallback = null) {
        // Call the module function with progress callback
        const result = await extractSUAP(year, semester, selectedCourses, progressCallback);
        return result;
    }

    /**
     * Scrape students from a SUAP subject
     * @param {string} subjectId - The SUAP subject ID (diario ID)
     * @returns {Promise<Array>} Array of student objects with name, email, and enrollment
     */
    async scrapeStudents(subjectId) {
        await SUAPScraper.initialize();

        // Step 1: Get student list from subject page
        const tab = suapConfig.subjectDetail.tab;
        const url = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/?tab=${tab}`;
        await SUAPScraper.goto(url, suapConfig.subjectDetail.ready);

        console.log(`Scraping students for subject ${subjectId}...`);

        const basicStudents = await SUAPScraper.evaluate((config) => {
            const rows = [];
            document.querySelectorAll(config.rowsSelector).forEach((tr) => {
                // Get enrollment from link href
                const enrollmentLink = tr.querySelector('a[href^="/edu/aluno/"]');
                const enrollment = enrollmentLink?.getAttribute('href')?.match(/\/edu\/aluno\/([^/]+)\//)?.[1];
                
                // Get name from image alt
                const img = tr.querySelector('img[alt^="Foto de "]');
                const name = img?.getAttribute('alt')?.replace('Foto de ', '');
                
                // Only add rows that have valid student data
                if (enrollment && name) {
                    rows.push({ enrollment, name });
                }
            });
            return rows;
        }, { rowsSelector: suapConfig.subjectDetail.students.rows });

        console.log(`Found ${basicStudents.length} students. Fetching emails...`);

        // Step 2: Fetch email for each student from their profile page
        const students = [];
        for (const student of basicStudents) {
            const email = await this.#fetchStudentEmail(student.enrollment);
            students.push({
                name: student.name,
                email,
                enrollment: student.enrollment,
            });
        }

        console.log(`Completed fetching ${students.length} students with emails`);

        // Save students to file
        await this.#saveStudents(subjectId, students);

        return students;
    }

    /**
     * Save students to JSON file
     * @param {string} subjectId - The SUAP subject ID
     * @param {Array} students - Array of student objects
     */
    async #saveStudents(subjectId, students) {
        let data = {};
        
        // Load existing data if file exists
        if (fs.existsSync(this.#studentsPath)) {
            try {
                const content = fs.readFileSync(this.#studentsPath, 'utf-8');
                data = JSON.parse(content);
            } catch (error) {
                console.error('Error reading existing students file:', error.message);
            }
        }
        
        // Add/update students for this subject
        data[subjectId] = students;
        
        // Write back to file
        fs.writeFileSync(this.#studentsPath, JSON.stringify(data, null, 2));
        console.log(`Saved ${students.length} students to ${this.#studentsPath}`);
    }

    /**
     * Fetch a student's email from their profile page
     * @param {string} enrollment - Student enrollment ID
     * @returns {Promise<string|null>} Student email or null if not found
     */
    async #fetchStudentEmail(enrollment) {
        const url = `${suapConfig.baseUrl}/${suapConfig.studentProfile.url}/${enrollment}/`;
        
        try {
            await SUAPScraper.goto(url, suapConfig.studentProfile.ready);
            
            const email = await SUAPScraper.evaluate((config) => {
                // Find the dt element with "E-mail Acadêmico" text
                const dtElements = document.querySelectorAll('dt');
                for (const dt of dtElements) {
                    if (dt.textContent.trim() === config.emailLabel) {
                        // Get the next sibling dd element
                        const dd = dt.nextElementSibling;
                        if (dd && dd.tagName === 'DD') {
                            return dd.textContent.trim();
                        }
                    }
                }
                return null;
            }, { emailLabel: suapConfig.studentProfile.email.label });
            
            return email;
        } catch (error) {
            console.error(`Error fetching email for ${enrollment}:`, error.message);
            return null;
        }
    }
}
