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
        if (progressCallback) progressCallback('Initializing browser automation');

        await SUAPScraper.initialize();

        // Use provided parameters or defaults
        year = year || new Date().getFullYear();
        semester = semester || (new Date().getMonth() < 6 ? 1 : 2);

        const courses = suapConfig.courses;
        const yearList = suapConfig.yearList;

        // Filter courses if selectedCourses array is provided
        const coursesToExtract = selectedCourses && selectedCourses.length > 0
            ? Object.keys(courses).filter(key => selectedCourses.includes(key))
            : Object.keys(courses);

        if (progressCallback) progressCallback(`Extracting data from ${coursesToExtract.length} courses`);

        const SUAPJson = [];

        for (let i = 0; i < coursesToExtract.length; i++) {
            const courseName = coursesToExtract[i];

            if (progressCallback) progressCallback(`Extracting course ${i + 1}/${coursesToExtract.length}: ${courseName}`);

            const query = new URLSearchParams({
                ...suapConfig.bookSearch.url.query,
                ano_letivo: yearList[year],
                periodo_letivo__exact: semester,
                turma__curso_campus: courses[courseName],
                tab: 'tab_any_data',
                all: 'true',
            }).toString();
            const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/?${query}`;
            await SUAPScraper.goto(url, suapConfig.bookSearch.ready);

            console.log(`Extracting data for course ${courseName}...`);
            const SUAPsubjects = await SUAPScraper.evaluate((template) => {
                const rows = [];
                document.querySelectorAll(template.rows).forEach((tr) => {
                    rows.push({ 
                        id: template.data.id(tr),
                        name: template.data.name(tr),
                        class: template.data.class(tr),
                    });
                });
                return rows;
            }, suapConfig.bookSearch);

            SUAPsubjects.forEach((subject) => {
                // Banco de Dados, remove extra spaces
                const subjectName = subject.name.split(' - ')?.[1]?.replace(/\s+/g, ' ').trim();
                // INF-1AT
                subject.className = `${courseName}-${subject.class.split('.')?.[1]}A${subject.class.at(-1)}`;
                // INF-1AT - Banco de Dados
                subject.fullname = `${subject.className} - ${subjectName}`;
                subject.subjectName = subjectName;
                subject.group = false;    
            });
            // search for duplicates: same fullname, different id: assign groups G1 and G2
            SUAPsubjects.forEach((subject) => {
                const duplicate = SUAPsubjects.find(s => s.fullname === subject.fullname && s !== subject);
                if (duplicate) {
                    subject.group = parseInt(duplicate.id) > parseInt(subject.id) ? 'G1' : 'G2';
                }
            });

            SUAPJson.push(...SUAPsubjects);
        }

        if (progressCallback) progressCallback(`Saving ${SUAPJson.length} subjects to file`);

        fs.writeFileSync(this.#dataPath, JSON.stringify(SUAPJson, null, 2));

        return SUAPJson;
    }

    /**
     * Scrape students from a SUAP subject
     * @param {string} subjectId - The SUAP subject ID (diario ID)
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Array>} Array of student objects with name, email, and enrollment
     */
    async scrapeStudents(subjectId, progressCallback = null) {
        await SUAPScraper.initialize();

        // Step 1: Get student list from subject page
        const tab = suapConfig.subjectDetail.tab;
        const url = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/?tab=${tab}`;
        
        if (progressCallback) progressCallback(`Loading subject page...`);
        await SUAPScraper.goto(url, suapConfig.subjectDetail.ready);

        console.log(`Scraping students for subject ${subjectId}...`);

        if (progressCallback) progressCallback(`Extracting student list...`);
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
        if (progressCallback) progressCallback(`Found ${basicStudents.length} students. Fetching emails...`);

        // Step 2: Fetch email for each student from their profile page
        const students = [];
        for (let i = 0; i < basicStudents.length; i++) {
            const student = basicStudents[i];
            
            if (progressCallback) {
                progressCallback(`Fetching email for student ${i + 1}/${basicStudents.length}:\n${student.name}`);
            }
            
            const email = await this.#fetchStudentEmail(student.enrollment);
            students.push({
                name: student.name,
                email,
                enrollment: student.enrollment,
            });
        }

        console.log(`Completed fetching ${students.length} students with emails`);
        if (progressCallback) progressCallback(`Completed fetching ${students.length} students. Saving...`);

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
        let data = {
            subjects: {},
            students: {}
        };
        
        // Load existing data if file exists
        if (fs.existsSync(this.#studentsPath)) {
            try {
                const content = fs.readFileSync(this.#studentsPath, 'utf-8');
                const existingData = JSON.parse(content);
                // Ensure structure exists (handle legacy format)
                data.subjects = existingData.subjects || {};
                data.students = existingData.students || {};
            } catch (error) {
                console.error('Error reading existing students file:', error.message);
            }
        }
        
        // Store enrollments list for this subject
        const enrollments = students.map(s => s.enrollment);
        data.subjects[subjectId] = enrollments;
        
        // Add/update student info (deduplicated by enrollment)
        students.forEach(student => {
            data.students[student.enrollment] = {
                name: student.name,
                email: student.email
            };
        });
        
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
