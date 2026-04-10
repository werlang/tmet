import path from 'path';
import fs from 'fs';
import { TimeTables } from '../helpers/timetables.js';
import { MoodleUploader } from '../helpers/moodle-uploader.js';
import { moodleConfig } from '../config/moodle-config.js';

/**
 * Moodle Model
 * Handles Moodle-related operations (CSV generation, course uploads)
 */
class Moodle {
    #csvPath;
    #manualCoursesCsvPath;
    #manualCoursesDataPath;
    #studentsCsvPath;
    #manualStudentsCsvPath;

    constructor() {
        this.#csvPath = path.resolve('files', 'moodle_classes.csv');
        this.#manualCoursesCsvPath = path.resolve('files', 'moodle_manual_classes.csv');
        this.#manualCoursesDataPath = path.resolve('files', 'moodle_manual_classes.json');
        this.#studentsCsvPath = path.resolve('files', 'moodle_students.csv');
        this.#manualStudentsCsvPath = path.resolve('files', 'moodle_manual_students.csv');
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
                const className = s.classids.length > 1 ? classes.filter(cl => s.classids.includes(cl.id)).map(cl => cl.name).join('|') : c.name;

                // "[2025.2] TSI-2AN - Desenvolvimento Back-end I", CH_TSI_2AN_DBE1_2025.2, 120
                // "[2025.2] TSI-4AN|ECA-8AN - Gestão e Empreendedorismo", CH_TSI_4AN_ECA_8AN_GE_2025.2, 120
                // "[2025.2] INF-2AT-G1 - Banco de Dados", CH_INF_2AT_BD_2025.2_G1, 115
                const fullName = `[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectObj.name.split('-').slice(1).join('-').trim()}`;
                const shortName = `CH_${className.replace(/[-,\|]/g, '_')}_${subjectObj.short.split(/\s*-\s*/)?.slice(1).join('')}_${year}.${semester}${group}`;
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
        
        const csv = this.#writeCourseCsv(this.#csvPath, moodleSubjects);
        
        if (progressCallback) progressCallback('CSV file saved successfully');

        return csv;
    }

    getCourseCategories() {
        return Object.entries(moodleConfig.categories)
            .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
            .map(([key, id]) => ({
                key,
                id,
                label: `${key} (${id})`,
            }));
    }

    getManualCourses() {
        return this.#loadManualCourseEntries();
    }

    removeManualCourse(fullname) {
        const normalizedFullname = String(fullname || '').trim();

        if (!normalizedFullname) {
            throw new Error('Course fullname is required.');
        }

        const manualCourses = this.#loadManualCourseEntries();
        const remainingCourses = manualCourses.filter(course => course.fullname !== normalizedFullname);

        if (remainingCourses.length === manualCourses.length) {
            throw new Error('Manual course not found.');
        }

        this.#saveManualCourseEntries(remainingCourses);

        return {
            fullname: normalizedFullname,
            totalCourses: remainingCourses.length,
        };
    }

    addManualCourse({ fullname, categoryKey }) {
        const normalizedFullname = String(fullname || '').trim();
        const normalizedCategoryKey = String(categoryKey || '').trim().toUpperCase();
        const category = moodleConfig.categories[normalizedCategoryKey];

        if (!normalizedFullname) {
            throw new Error('Course fullname is required.');
        }

        if (!category) {
            throw new Error('Valid Moodle category is required.');
        }

        const courseData = this.#parseManualCourseFullname(normalizedFullname);
        const shortname = this.#buildManualCourseShortname(courseData);
        const existingCourses = [
            ...this.#loadAllCourseRows(),
            ...this.#loadManualCourseEntries(),
        ];

        if (existingCourses.some(course => course.fullname === normalizedFullname)) {
            throw new Error('A Moodle course with this fullname already exists.');
        }

        if (existingCourses.some(course => course.shortname === shortname)) {
            throw new Error(`Generated shortname already exists: ${shortname}`);
        }

        const manualCourses = this.#loadManualCourseEntries();
        const manualCourse = {
            fullname: normalizedFullname,
            shortname,
            category,
            categoryKey: normalizedCategoryKey,
        };

        manualCourses.push(manualCourse);
        this.#saveManualCourseEntries(manualCourses);

        return {
            file: this.#manualCoursesDataPath,
            ...manualCourse,
        };
    }

    createManualCourse(params) {
        return this.addManualCourse(params);
    }

    async generateManualCourseCSV(progressCallback = null) {
        if (progressCallback) progressCallback('Loading manual courses data');

        const manualCourses = this.#loadManualCourseEntries();

        if (manualCourses.length === 0) {
            throw new Error('Manual course queue is empty. Add manual courses first.');
        }

        if (progressCallback) progressCallback('Writing manual courses CSV file');

        const csvRows = manualCourses
            .map(course => [course.fullname, course.shortname, course.category])
            .sort((left, right) => left[0].localeCompare(right[0]));

        this.#writeCourseCsv(this.#manualCoursesCsvPath, csvRows);

        return {
            file: this.#manualCoursesCsvPath,
            totalCourses: csvRows.length,
        };
    }

    #writeCourseCsv(filePath, rows) {
        const csvRows = [this.#getCourseCsvHeader(), ...rows];
        const csv = csvRows
            .map(([fullname, shortname, category]) => {
                if (fullname === 'fullname' && shortname === 'shortname') {
                    return 'fullname, shortname, category';
                }

                return `"${fullname}", ${shortname}, ${category}`;
            })
            .join('\n');

        fs.writeFileSync(filePath, csv);
        return csv;
    }

    #getCourseCsvHeader() {
        return ['fullname', 'shortname', 'category'];
    }

    #parseCourseCsv(filePath) {
        if (!fs.existsSync(filePath)) {
            return [];
        }

        return fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .slice(1)
            .map(line => line?.match(/"(.+)",\s*(.+),\s*(\d+)/))
            .filter(Boolean)
            .map(([, fullname, shortname, category]) => ({
                fullname,
                shortname: shortname.trim(),
                category: parseInt(category, 10),
            }));
    }

    #loadManualCourseEntries() {
        if (fs.existsSync(this.#manualCoursesDataPath)) {
            const manualCourses = JSON.parse(fs.readFileSync(this.#manualCoursesDataPath, 'utf-8'));
            return this.#normalizeManualCourses(manualCourses);
        }

        if (fs.existsSync(this.#manualCoursesCsvPath)) {
            return this.#parseCourseCsv(this.#manualCoursesCsvPath)
                .map(course => ({
                    ...course,
                    categoryKey: this.#getCategoryKeyById(course.category),
                }));
        }

        return [];
    }

    #saveManualCourseEntries(manualCourses) {
        fs.writeFileSync(this.#manualCoursesDataPath, JSON.stringify(manualCourses, null, 2));
    }

    #normalizeManualCourses(manualCourses = []) {
        return Array.isArray(manualCourses)
            ? manualCourses
                .map(course => ({
                    fullname: String(course?.fullname || '').trim(),
                    shortname: String(course?.shortname || '').trim(),
                    category: Number.parseInt(course?.category, 10),
                    categoryKey: String(course?.categoryKey || this.#getCategoryKeyById(course?.category) || '').trim().toUpperCase(),
                }))
                .filter(course => course.fullname && course.shortname && Number.isInteger(course.category))
            : [];
    }

    #getCategoryKeyById(categoryId) {
        return Object.entries(moodleConfig.categories)
            .find(([, id]) => Number(id) === Number(categoryId))?.[0] || '';
    }

    #loadAllCourseRows() {
        const seenFullnames = new Set();
        const courseRows = [];

        [this.#csvPath, this.#manualCoursesCsvPath].forEach(filePath => {
            this.#parseCourseCsv(filePath).forEach(course => {
                if (seenFullnames.has(course.fullname)) {
                    return;
                }

                seenFullnames.add(course.fullname);
                courseRows.push(course);
            });
        });

        return courseRows;
    }

    #parseManualCourseFullname(fullname) {
        const match = fullname.match(/^\[(\d{4})\.(\d)\]\s+(.+?)\s+-\s+(.+)$/);

        if (!match) {
            throw new Error('Course fullname must follow the format [YYYY.S] CLASS - Subject Name.');
        }

        const [, year, semester, rawClassName, subjectName] = match;
        const groupMatch = rawClassName.match(/^(.*?)(-G[12])$/);

        return {
            year,
            semester,
            className: (groupMatch?.[1] || rawClassName).trim(),
            group: groupMatch?.[2]?.replace('-', '_') || '',
            subjectName: subjectName.trim(),
        };
    }

    #buildManualCourseShortname({ className, group, subjectName, year, semester }) {
        const classToken = className.replace(/[-,\|]/g, '_');
        const subjectToken = this.#buildSubjectToken(subjectName);

        return `CH_${classToken}_${subjectToken}_${year}.${semester}${group}`;
    }

    #buildSubjectToken(subjectName) {
        const stopWords = new Set(['a', 'ao', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por']);
        const romanMap = new Map([
            ['I', '1'],
            ['II', '2'],
            ['III', '3'],
            ['IV', '4'],
            ['V', '5'],
            ['VI', '6'],
            ['VII', '7'],
            ['VIII', '8'],
            ['IX', '9'],
            ['X', '10'],
        ]);

        const normalizedWords = subjectName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/&/g, ' ')
            .split(/[^A-Za-z0-9+]+/)
            .map(word => word.trim())
            .filter(Boolean);

        const significantWords = normalizedWords.filter(word => {
            const upperWord = word.toUpperCase();
            return romanMap.has(upperWord) || /^\d+$/.test(word) || !stopWords.has(word.toLowerCase());
        });

        const words = significantWords.length > 0 ? significantWords : normalizedWords;
        const token = words
            .map((word, index) => {
                const upperWord = word.toUpperCase();

                if (romanMap.has(upperWord)) {
                    return romanMap.get(upperWord);
                }

                if (/^\d+$/.test(word)) {
                    return word;
                }

                if (word.length <= 3) {
                    return upperWord;
                }

                const sliceLength = index === 0 ? 4 : (words.length > 2 ? 3 : 4);
                const base = word.slice(0, sliceLength).toLowerCase();
                return base.charAt(0).toUpperCase() + base.slice(1);
            })
            .join('')
            .replace(/[^A-Za-z0-9]/g, '');

        if (!token) {
            throw new Error('Could not generate a shortname from the provided course fullname.');
        }

        return token;
    }

    #getProfessorId(professor = {}) {
        if (typeof professor.id === 'string' && professor.id.trim()) {
            return professor.id.trim();
        }

        if (typeof professor.email !== 'string') {
            return '';
        }

        return professor.email.split('@')[0]?.trim() || '';
    }

    #normalizeManualEnrollments(manualEnrollments = {}) {
        return Object.fromEntries(
            Object.entries(manualEnrollments || {}).map(([enrollment, manualEnrollment]) => {
                const rawCourseIds = Array.isArray(manualEnrollment?.courseIds)
                    ? manualEnrollment.courseIds
                    : Array.isArray(manualEnrollment?.courses)
                        ? manualEnrollment.courses
                        : [];

                return [enrollment, {
                    password: typeof manualEnrollment?.password === 'string'
                        ? manualEnrollment.password.trim()
                        : '',
                    courseIds: Array.from(new Set(
                        rawCourseIds
                            .map(courseId => String(courseId || '').trim())
                            .filter(Boolean)
                    )),
                }];
            })
        );
    }

    #buildStudentCsvRow({ enrollment, student = {}, password, courseId }) {
        const studentName = student.name || '';
        const studentEmail = student.email || '';
        const nameParts = studentName.trim().split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const username = studentEmail.split('@')[0] || enrollment;

        return [
            username,
            password || enrollment,
            firstName,
            lastName,
            studentEmail,
            courseId,
            'student'
        ];
    }

    #getStudentCsvHeader() {
        return ['username', 'password', 'firstname', 'lastname', 'email', 'course1', 'role1'];
    }

    #writeStudentCsv(filePath, rows) {
        const csvString = rows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filePath, csvString);
        return csvString;
    }

    #parseStudentCsv(filePath) {
        if (!fs.existsSync(filePath)) {
            return [];
        }

        return fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .slice(1)
            .filter(line => line.trim())
            .map(line => {
                const parts = line.split(',').map(item => item.trim());
                return {
                    username: parts[0],
                    password: parts[1],
                    firstname: parts[2],
                    lastname: parts[3],
                    email: parts[4],
                    course: parts[5],
                };
            });
    }

    /**
     * Upload courses to Moodle
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Upload results
     */
    async uploadCourses(progressCallback = null) {
        const courses = this.#loadAllCourseRows();

        if (courses.length === 0) {
            throw new Error('CSV file not found. Generate CSV first.');
        }

        return this.#uploadCourseRows(courses, progressCallback);
    }

    async #uploadCourseRows(courses, progressCallback = null) {

        if (progressCallback) progressCallback('Initializing Moodle uploader');
        
        const uploader = new MoodleUploader(
            process.env.MOODLE_URL,
            process.env.MOODLE_TOKEN,
        );

        if (progressCallback) progressCallback(`Uploading ${courses.length} courses to Moodle`);

        // Upload via API
        console.log('\n=== Uploading via Moodle Web Service API ===\n');
        const results = await uploader.uploadCourses(courses, progressCallback);
        
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
        const csvPath = this.#studentsCsvPath;

        if (progressCallback) progressCallback('Loading students data');

        if (!fs.existsSync(studentsPath)) {
            throw new Error('Students data not found. Extract students first.');
        }

        const studentsData = JSON.parse(fs.readFileSync(studentsPath, 'utf-8'));
        const subjectStudents = studentsData.subjects || {};
        const studentInfo = studentsData.students || {};

        const moodleSubjects = this.#loadAllCourseRows();

        if (moodleSubjects.length === 0) {
            throw new Error('Moodle courses CSV not found. Generate courses CSV first.');
        }

        // Load all matches from unified matches.json
        const matchesPath = path.resolve('files', 'matches.json');
        const matches = fs.existsSync(matchesPath) 
            ? JSON.parse(fs.readFileSync(matchesPath, 'utf-8')) 
            : [];

        if (progressCallback) progressCallback('Processing matched subjects');

        const csvRows = [this.#getStudentCsvHeader()];
        const writtenRows = new Set();

        let totalStudents = 0;
        let processedSubjects = 0;

        const appendStudentRow = ({ enrollment, student, password, courseId }) => {
            const normalizedCourseId = String(courseId || '').trim();
            if (!normalizedCourseId) {
                return;
            }

            const rowKey = `${enrollment}:${normalizedCourseId}`;
            if (writtenRows.has(rowKey)) {
                return;
            }

            csvRows.push(this.#buildStudentCsvRow({
                enrollment,
                student,
                password,
                courseId: normalizedCourseId,
            }));
            writtenRows.add(rowKey);
            totalStudents++;
        };

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

                appendStudentRow({
                    enrollment,
                    student,
                    password: enrollment,
                    courseId: moodleSubject.shortname,
                });
            }

            processedSubjects++;
            if (progressCallback) {
                progressCallback(`Processed ${processedSubjects}/${matches.length} subjects`);
            }
        }

        if (progressCallback) progressCallback('Writing CSV file');

        this.#writeStudentCsv(csvPath, csvRows);

        console.log(`Student CSV generated at: ${csvPath}`);
        console.log(`Total students: ${totalStudents}, Subjects processed: ${processedSubjects}`);

        return {
            file: csvPath,
            totalStudents,
            processedSubjects
        };
    }

    async generateManualStudentCSV(progressCallback = null) {
        const studentsPath = path.resolve('files', 'suap_students.json');
        const csvPath = this.#manualStudentsCsvPath;

        if (progressCallback) progressCallback('Loading manual students data');

        if (!fs.existsSync(studentsPath)) {
            throw new Error('Students data not found. Add manual students first.');
        }

        const studentsData = JSON.parse(fs.readFileSync(studentsPath, 'utf-8'));
        const studentInfo = studentsData.students || {};
        const manualEnrollments = this.#normalizeManualEnrollments(studentsData.manualEnrollments);

        const csvRows = [this.#getStudentCsvHeader()];
        const writtenRows = new Set();
        let totalStudents = 0;
        let manualStudents = 0;

        if (progressCallback) progressCallback('Processing manual student enrollments');

        for (const [enrollment, manualEnrollment] of Object.entries(manualEnrollments)) {
            const student = studentInfo[enrollment];
            if (!student) {
                continue;
            }

            manualStudents++;
            manualEnrollment.courseIds.forEach(courseId => {
                const normalizedCourseId = String(courseId || '').trim();
                if (!normalizedCourseId) {
                    return;
                }

                const rowKey = `${enrollment}:${normalizedCourseId}`;
                if (writtenRows.has(rowKey)) {
                    return;
                }

                csvRows.push(this.#buildStudentCsvRow({
                    enrollment,
                    student,
                    password: manualEnrollment.password || enrollment,
                    courseId: normalizedCourseId,
                }));
                writtenRows.add(rowKey);
                totalStudents++;
            });
        }

        if (progressCallback) progressCallback('Writing manual students CSV file');

        this.#writeStudentCsv(csvPath, csvRows);

        return {
            file: csvPath,
            totalStudents,
            manualStudents,
        };
    }

    /**
     * Generate professors CSV for Moodle bulk enrollment
     * Uses matched subjects and their professors from suap_professors.json
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Result with file path and stats
     */
    async generateProfessorCSV(progressCallback = null) {
        const professorsPath = path.resolve('files', 'suap_professors.json');
        const csvPath = path.resolve('files', 'moodle_professors.csv');

        if (progressCallback) progressCallback('Loading professors data');

        if (!fs.existsSync(professorsPath)) {
            throw new Error('Professors data not found. Extract professors first.');
        }

        const moodleSubjects = this.#loadAllCourseRows();

        if (moodleSubjects.length === 0) {
            throw new Error('Moodle courses CSV not found. Generate courses CSV first.');
        }

        const professorsData = JSON.parse(fs.readFileSync(professorsPath, 'utf-8'));
        const { subjects: subjectProfessors, professors: professorInfo } = professorsData;

        // Load all matches from unified matches.json
        const matchesPath = path.resolve('files', 'matches.json');
        const matches = fs.existsSync(matchesPath) 
            ? JSON.parse(fs.readFileSync(matchesPath, 'utf-8')) 
            : [];

        if (progressCallback) progressCallback('Processing matched subjects');

        const csvRows = [];
        const header = ['username', 'password', 'firstname', 'lastname', 'email', 'course1', 'role1'];
        csvRows.push(header);

        let totalProfessors = 0;
        let processedSubjects = 0;

        // Process each match (auto and manual) to find professors
        for (const match of matches) {
            const moodleSubject = moodleSubjects.find(s => s.fullname === match.moodleFullname);
            if (!moodleSubject) continue;

            // Handle both single and array suapId
            const suapIds = Array.isArray(match.suapId) ? match.suapId : [match.suapId];

            // Collect unique SIAPEs from all SUAP subjects
            const siapeSet = new Set();
            for (const suapId of suapIds) {
                const siapes = subjectProfessors[suapId] || [];
                siapes.forEach(s => siapeSet.add(s));
            }

            // Add professors to CSV
            for (const siape of siapeSet) {
                const professor = professorInfo[siape];
                if (!professor) continue;

                const professorId = this.#getProfessorId(professor);
                const professorName = professor.name || '';
                const professorEmail = professor.email || '';
                const nameParts = professorName.trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Skip if no valid professor id is available
                if (!professorId) continue;

                csvRows.push([
                    professorId,
                    '123456',
                    firstName,
                    lastName,
                    professorEmail,
                    moodleSubject.shortname,
                    'editingteacher'
                ]);
                totalProfessors++;
            }

            processedSubjects++;
            if (progressCallback) {
                progressCallback(`Processed ${processedSubjects}/${matches.length} subjects`);
            }
        }

        if (progressCallback) progressCallback('Writing CSV file');

        const csvString = csvRows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(csvPath, csvString);

        console.log(`Professor CSV generated at: ${csvPath}`);
        console.log(`Total professors: ${totalProfessors}, Subjects processed: ${processedSubjects}`);

        return {
            file: csvPath,
            totalProfessors,
            processedSubjects
        };
    }

    /**
     * Upload students to Moodle
     * Reads the students CSV and enrolls them in courses
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Upload results
     */
    async uploadStudents(progressCallback = null) {
        const hasRegularCsv = fs.existsSync(this.#studentsCsvPath);
        const hasManualCsv = fs.existsSync(this.#manualStudentsCsvPath);

        if (!hasRegularCsv && !hasManualCsv) {
            throw new Error('Students CSV files not found. Generate students CSV first.');
        }

        if (progressCallback) progressCallback('Initializing Moodle uploader');
        
        const uploader = new MoodleUploader(
            process.env.MOODLE_URL,
            process.env.MOODLE_TOKEN,
        );

        const students = [
            ...(hasRegularCsv ? this.#parseStudentCsv(this.#studentsCsvPath) : []),
            ...(hasManualCsv ? this.#parseStudentCsv(this.#manualStudentsCsvPath) : []),
        ];

        const uniqueStudents = [];
        const seenEnrollments = new Set();
        students.forEach(student => {
            const rowKey = `${student.username}:${student.course}`;
            if (seenEnrollments.has(rowKey)) {
                return;
            }

            seenEnrollments.add(rowKey);
            uniqueStudents.push(student);
        });

        if (progressCallback) progressCallback(`Uploading ${uniqueStudents.length} students to Moodle`);

        console.log('\n=== Uploading Students via Moodle Web Service API ===\n');
        const results = await uploader.uploadStudents(uniqueStudents, progressCallback);
        
        return results;
    }

    /**
     * Upload professors to Moodle
     * Reads the professors CSV and enrolls them in courses as teachers
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Object>} Upload results
     */
    async uploadProfessors(progressCallback = null) {
        const csvPath = path.resolve('files', 'moodle_professors.csv');

        if (!fs.existsSync(csvPath)) {
            throw new Error('Professors CSV file not found. Generate professors CSV first.');
        }

        if (progressCallback) progressCallback('Initializing Moodle uploader');
        
        const uploader = new MoodleUploader(
            process.env.MOODLE_URL,
            process.env.MOODLE_TOKEN,
        );

        // Parse CSV - format: username,password,firstname,lastname,email,course1,role1
        const professors = fs.readFileSync(csvPath, 'utf-8')
            .split('\n')
            .slice(1) // Skip header row
            .filter(line => line.trim()) // Skip empty lines
            .map(line => {
                const parts = line.split(',').map(item => item.trim());
                return {
                    username: parts[0],
                    password: parts[1],
                    firstname: parts[2],
                    lastname: parts[3],
                    email: parts[4],
                    course: parts[5], // course1 is the shortname
                };
            });

        if (progressCallback) progressCallback(`Uploading ${professors.length} professors to Moodle`);

        console.log('\n=== Uploading Professors via Moodle Web Service API ===\n');
        const results = await uploader.uploadProfessors(professors, progressCallback);
        
        return results;
    }
}

export { Moodle };
