import path from 'path';
import fs from 'fs';
import TimeTables from '../helpers/timetables.js';
import MoodleUploader from '../helpers/moodle-uploader.js';
import moodleConfig from '../config/moodle-config.js';

/**
 * Moodle Model
 * Handles Moodle-related operations (CSV generation, course uploads)
 */
export default class Moodle {
    #csvPath;

    constructor() {
        this.#csvPath = path.resolve('files', 'moodle_classes.csv');
    }

    /**
     * Generate CSV from timetables
     * @param {Object} options - Generation options
     * @param {number} options.year - Year
     * @param {number} options.semester - Semester
     * @param {string} options.dateFrom - Start date
     * @param {string} options.dateTo - End date
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<string>} CSV content
     */
    async generateCourseCSV({ year, semester, dateFrom, dateTo }, progressCallback = null) {
        const moodleSubjects = [];

        if (progressCallback) progressCallback('Fetching classes from EduPage API');

        const tt = new TimeTables({
            year,
            dateFrom,
            dateTo,
        });
        const classes = await tt.getClasses();
        
        if (progressCallback) progressCallback(`Processing ${classes.length} classes and subjects`);
        
        classes.forEach(c => {
            c.subjects?.forEach(s => {
                const subjectObj = s.subject;

                const group = s.groupnames.includes('Grupo 1') ? '_G1' : s.groupnames.includes('Grupo 2') ? '_G2' : '';
                const className = s.classids.length > 1 ? classes.filter(cl => s.classids.includes(cl.id)).map(cl => cl.name).join(',') : c.name;

                // "[2025.2] TSI-2AN - Desenvolvimento Back-end I", CH_TSI_2AN_DBE1_2025.2, 120
                // "[2025.2] TSI-4AN,ECA-8AN - Gestão e Empreendedorismo", CH_TSI_4AN_ECA_8AN_GE_2025.2, 120
                // "[2025.2] INF-2AT-G1 - Banco de Dados", CH_INF_2AT_BD_2025.2_G1, 115
                const fullName = `"[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectObj.name.split('-').slice(1).join('-').trim()}"`;
                const shortName = `CH_${className.replace(/[-,]/g, '_')}_${subjectObj.short.split(/\s*-\s*/)?.slice(1).join('')}_${year}.${semester}${group}`;
                const category = moodleConfig.categories[c.name.split('-')[0]];

                if (!moodleSubjects.map(ms => ms[0]).includes(fullName) && category) {
                    moodleSubjects.push([
                        fullName,
                        shortName,
                        category,
                    ]);
                }
            });
        });
        console.log(JSON.stringify(moodleSubjects.map(ms => ms.join(', ')), null, 2));
        
        if (progressCallback) progressCallback(`Generating CSV file with ${moodleSubjects.length} subjects`);
        
        const header = ['fullname', 'shortname', 'category'];
        moodleSubjects.unshift(header);
        const csv = moodleSubjects.map(ms => ms.join(', ')).join('\n');

        fs.writeFileSync(this.#csvPath, csv);
        
        if (progressCallback) progressCallback('CSV file saved successfully');

        return csv;
    }

    /**
     * Upload courses to Moodle
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Upload results
     */
    async uploadCourses(progressCallback = null) {
        if (!fs.existsSync(this.#csvPath)) {
            throw new Error('CSV file not found. Generate CSV first.');
        }

        if (progressCallback) progressCallback('Initializing Moodle uploader');
        
        const uploader = new MoodleUploader(
            process.env.MOODLE_URL,
            process.env.MOODLE_TOKEN,
        );

        const courses = fs.readFileSync(this.#csvPath, 'utf-8')
            .split('\n')
            .map(line => line.split(',').map(item => item.trim()))
            .map(item => ({
                fullname: item[0],
                shortname: item[1],
                category: item[2],
            }));

        if (progressCallback) progressCallback(`Uploading ${courses.length} courses to Moodle`);

        // Upload via API
        console.log('\n=== Uploading via Moodle Web Service API ===\n');
        const results = await uploader.uploadCourses(courses, progressCallback);
        
        console.log('\n=== Upload Summary ===');
        console.log(`✓ Successfully created: ${results.success.length}`);
        console.log(`✗ Failed: ${results.errors.length}`);
        
        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(err => {
                console.log(`  - ${err.course}: ${err.error}`);
            });
        }

        return results;
    }

    /**
     * Generate students CSV for Moodle bulk enrollment
     * Uses matched subjects and their students from suap_students.json
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Result with file path and stats
     */
    async generateStudentCSV(progressCallback = null) {
        const studentsPath = path.resolve('files', 'suap_students.json');
        const csvPath = path.resolve('files', 'moodle_students.csv');

        if (progressCallback) progressCallback('Loading students data');

        if (!fs.existsSync(studentsPath)) {
            throw new Error('Students data not found. Extract students first.');
        }

        if (!fs.existsSync(this.#csvPath)) {
            throw new Error('Moodle courses CSV not found. Generate courses CSV first.');
        }

        const studentsData = JSON.parse(fs.readFileSync(studentsPath, 'utf-8'));
        const { subjects: subjectStudents, students: studentInfo } = studentsData;

        // Load all matches from unified matches.json
        const matchesPath = path.resolve('files', 'matches.json');
        const moodleCsvContent = fs.readFileSync(this.#csvPath, 'utf-8');
        const matches = fs.existsSync(matchesPath) 
            ? JSON.parse(fs.readFileSync(matchesPath, 'utf-8')) 
            : [];

        // Parse Moodle CSV to get shortnames
        const moodleSubjects = moodleCsvContent
            .split('\n')
            .slice(1) // Skip header
            .map(line => {
                const match = line?.match(/"(.+)", (.+), (\d+)/);
                if (!match) return null;
                return {
                    fullname: match[1],
                    shortname: match[2],
                    category: match[3]
                };
            })
            .filter(s => s !== null);

        if (progressCallback) progressCallback('Processing matched subjects');

        const csvRows = [];
        const header = ['username', 'password', 'firstname', 'lastname', 'email', 'course1', 'role1'];
        csvRows.push(header);

        let totalStudents = 0;
        let processedSubjects = 0;

        // Process each match (auto and manual) to find students
        for (const match of matches) {
            const moodleSubject = moodleSubjects.find(s => s.fullname === match.moodleFullname);
            if (!moodleSubject) continue;

            // Handle both single and array suapId
            const suapIds = Array.isArray(match.suapId) ? match.suapId : [match.suapId];

            // Collect unique enrollments from all SUAP subjects
            const enrollmentSet = new Set();
            for (const suapId of suapIds) {
                const enrollments = subjectStudents[suapId] || [];
                enrollments.forEach(e => enrollmentSet.add(e));
            }

            // Add students to CSV
            for (const enrollment of enrollmentSet) {
                const student = studentInfo[enrollment];
                if (!student) continue;

                const studentName = student.name || '';
                const studentEmail = student.email || '';
                const nameParts = studentName.trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                const username = studentEmail.split('@')[0] || enrollment;

                csvRows.push([
                    username,
                    enrollment,
                    firstName,
                    lastName,
                    studentEmail,
                    moodleSubject.shortname,
                    'student'
                ]);
                totalStudents++;
            }

            processedSubjects++;
            if (progressCallback) {
                progressCallback(`Processed ${processedSubjects}/${matches.length} subjects`);
            }
        }

        if (progressCallback) progressCallback('Writing CSV file');

        const csvString = csvRows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(csvPath, csvString);

        console.log(`Student CSV generated at: ${csvPath}`);
        console.log(`Total students: ${totalStudents}, Subjects processed: ${processedSubjects}`);

        return {
            file: csvPath,
            totalStudents,
            processedSubjects
        };
    }
}
