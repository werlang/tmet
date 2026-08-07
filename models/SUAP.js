import path from 'path';
import fs from 'fs';
import { SUAPScraper } from '../helpers/scraper.js';
import { suapConfig } from '../config/suap-config.js';

/**
 * SUAP Model
 * Handles SUAP extraction operations
 */
class SUAP {
    #dataPath;
    #studentsPath;
    #professorsPath;
    #studentsBySubjectCache;
    #professorsBySubjectCache;
    #studentProfileCache;
    #studentEmailCache;
    #professorEmailCache;

    constructor() {
        this.#dataPath = path.resolve('files', 'suap_subjects.json');
        this.#studentsPath = path.resolve('files', 'suap_students.json');
        this.#professorsPath = path.resolve('files', 'suap_professors.json');
        this.#studentsBySubjectCache = new Map();
        this.#professorsBySubjectCache = new Map();
        this.#studentProfileCache = new Map();
        this.#studentEmailCache = new Map();
        this.#professorEmailCache = new Map();
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
                ano_letivo: this.#getYearOffset(year),
                periodo_letivo__exact: semester,
                turma__curso_campus: courses[courseName],
                tab: 'tab_any_data',
                all: 'true',
            }).toString();
            const url = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/?${query}`;
            console.log(url);
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

            // Contract validation: Ensure DOM layout did not break silently
            if (SUAPsubjects.length > 0) {
                const validRows = SUAPsubjects.filter(s => s.id && s.name && s.class);
                if (validRows.length === 0) {
                    throw new Error(`SUAP_DOM_CHANGED: Table rows were found for course ${courseName} but field extraction failed. SUAP layout structure may have changed.`);
                }
            }

            SUAPsubjects.forEach((subject) => {
                // Banco de Dados, remove extra spaces
                const subjectName = (subject.name || '').split(' - ')?.[1]?.replace(/\s+/g, ' ').trim() || subject.name || '';
                // INF-1AT
                const classPart = subject.class ? subject.class.split('.')?.[1] : '';
                const lastChar = subject.class ? subject.class.at(-1) : '';
                subject.className = `${courseName}-${classPart}A${lastChar}`;
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
     * Extract specific subjects by ID from SUAP and merge with suap_subjects.json
     * Picks a single unfetched diário ID, queries SUAP to discover its exact (course, year, semester) context,
     * then fetches the entire group batch for that context, culling all returned IDs from the unfetched set.
     * @param {string[]} subjectIds - Array of SUAP subject IDs to extract
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<Array>} Extracted/merged subjects
     */
    async extractSubjectsByIds(subjectIds, progressCallback = null) {
        if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
            throw new Error('Array of subject IDs is required');
        }

        if (progressCallback) progressCallback('Initializing browser automation');
        await SUAPScraper.initialize();

        // Load existing subjects if file exists
        let existingSubjects = [];
        if (fs.existsSync(this.#dataPath)) {
            try {
                existingSubjects = JSON.parse(fs.readFileSync(this.#dataPath, 'utf-8')) || [];
            } catch (err) {
                console.error('Error reading existing suap_subjects.json:', err);
                existingSubjects = [];
            }
        }

        const targetIds = new Set(subjectIds.map(id => String(id).trim()).filter(Boolean));
        const unfetchedIds = new Set(targetIds);
        const extractedSubjectsMap = new Map();
        const courses = suapConfig.courses;

        // Helper to format raw SUAP subject row
        const formatSubjectRow = (rawRow) => {
            if (!rawRow || !rawRow.id) return null;

            const rawClass = rawRow.class || '';
            const parts = rawClass.split('.').filter(Boolean);

            let courseName = Object.keys(courses).find(code =>
                rawClass.includes(`.${code}`) || rawClass.includes(`.${code}_`)
            ) || parts.find(p => courses[p]) || parts[3]?.split('_')?.[0] || 'COURSE';

            const subjectName = (rawRow.name || '').split(' - ')?.[1]?.replace(/\s+/g, ' ').trim() || rawRow.name || '';
            const period = parts[1] || '1';
            const shift = rawClass.at(-1) || 'T';
            const className = `${courseName}-${period}A${shift}`;
            const fullname = `${className} - ${subjectName}`;

            return {
                id: String(rawRow.id),
                name: rawRow.name,
                class: rawClass,
                className,
                fullname,
                subjectName,
                group: false
            };
        };

        const queriedBatches = new Set();
        let loopIndex = 0;

        // Loop while there are still unfetched IDs
        while (unfetchedIds.size > 0) {
            loopIndex++;
            const currentId = unfetchedIds.values().next().value;

            if (progressCallback) {
                progressCallback(`Step ${loopIndex}: Discovering context for diário ID ${currentId} (${unfetchedIds.size} remaining)...`);
            }

            // Step A: Discover context by searching for single diário ID directly in SUAP
            let discoveredRow = null;
            try {
                const query = new URLSearchParams({
                    ...suapConfig.bookSearch.url.query,
                    q: currentId,
                    tab: 'tab_any_data',
                    all: 'true',
                }).toString();
                const discoveryUrl = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/?${query}`;

                await SUAPScraper.goto(discoveryUrl, suapConfig.bookSearch.ready);

                const rows = await SUAPScraper.evaluate((template) => {
                    const results = [];
                    document.querySelectorAll(template.rows).forEach((tr) => {
                        results.push({
                            id: template.data.id(tr),
                            name: template.data.name(tr),
                            class: template.data.class(tr),
                        });
                    });
                    return results;
                }, suapConfig.bookSearch);

                discoveredRow = rows.find(r => String(r.id) === String(currentId));
            } catch (err) {
                console.error(`Error discovering context for diário ID ${currentId}:`, err.message);
            }

            // Always delete currentId from unfetchedIds so we never infinite loop
            unfetchedIds.delete(currentId);

            if (discoveredRow && discoveredRow.id) {
                const formatted = formatSubjectRow(discoveredRow);
                if (formatted) {
                    extractedSubjectsMap.set(formatted.id, formatted);
                }
            } else {
                continue;
            }

            // Step B: Infer (course, year, semester) or campus period from the discovered class string
            const rawClass = discoveredRow.class || '';
            const parts = rawClass.split('.').filter(Boolean);
            const rawYear = parts[0]?.slice(0, 4) || new Date().getFullYear();
            const semester = parts[1] || (new Date().getMonth() < 6 ? 1 : 2);
            const courseCode = Object.keys(courses).find(code =>
                rawClass.includes(`.${code}`) || rawClass.includes(`.${code}_`)
            ) || parts[3]?.split('_')?.[0];

            const courseId = courseCode ? courses[courseCode] : null;
            const batchKey = courseId ? `${courseCode}-${rawYear}-${semester}` : `campus-${rawYear}-${semester}`;

            if (queriedBatches.has(batchKey)) {
                // Batch already fetched, move on
                continue;
            }
            queriedBatches.add(batchKey);

            // Step C: Fetch the full group batch for this discovered context
            if (progressCallback) {
                progressCallback(`Fetching group batch ${batchKey} for ${unfetchedIds.size} remaining IDs...`);
            }

            const queryParams = {
                tab: 'tab_any_data',
                all: 'true',
                ano_letivo: this.#getYearOffset(parseInt(rawYear)),
                periodo_letivo__exact: semester,
            };

            if (courseId) {
                queryParams.turma__curso_campus = courseId;
            } else {
                queryParams.turma__curso_campus__diretoria__setor__uo = suapConfig.bookSearch.url.query.turma__curso_campus__diretoria__setor__uo || 4;
            }

            const batchUrl = `${suapConfig.baseUrl}/${suapConfig.bookSearch.url.base}/?${new URLSearchParams(queryParams).toString()}`;

            try {
                await SUAPScraper.goto(batchUrl, suapConfig.bookSearch.ready);

                const rows = await SUAPScraper.evaluate((template) => {
                    const results = [];
                    document.querySelectorAll(template.rows).forEach((tr) => {
                        results.push({
                            id: template.data.id(tr),
                            name: template.data.name(tr),
                            class: template.data.class(tr),
                        });
                    });
                    return results;
                }, suapConfig.bookSearch);

                let culledCount = 0;
                rows.forEach((row) => {
                    if (row && row.id) {
                        const formattedRow = formatSubjectRow(row);
                        if (formattedRow) {
                            extractedSubjectsMap.set(formattedRow.id, formattedRow);
                            if (unfetchedIds.has(formattedRow.id)) {
                                unfetchedIds.delete(formattedRow.id);
                                culledCount++;
                            }
                        }
                    }
                });

                console.log(`[Group Batch ${batchKey}] Retrieved ${rows.length} total rows, culled ${culledCount} unfetched IDs.`);
            } catch (err) {
                console.error(`Error fetching group batch ${batchKey}:`, err.message);
            }
        }

        // Merge extracted subjects into existingSubjects
        extractedSubjectsMap.forEach((newSubject, id) => {
            const index = existingSubjects.findIndex(s => String(s.id) === String(id));
            if (index >= 0) {
                existingSubjects[index] = newSubject;
            } else {
                existingSubjects.push(newSubject);
            }
        });

        // Re-evaluate duplicates for group assignment (G1/G2)
        existingSubjects.forEach((subject) => {
            const duplicate = existingSubjects.find(s => s.fullname === subject.fullname && String(s.id) !== String(subject.id));
            if (duplicate) {
                subject.group = parseInt(duplicate.id) > parseInt(subject.id) ? 'G1' : 'G2';
            } else {
                subject.group = false;
            }
        });

        if (progressCallback) progressCallback(`Saving ${existingSubjects.length} total subjects to file`);
        fs.writeFileSync(this.#dataPath, JSON.stringify(existingSubjects, null, 2));

        return existingSubjects;
    }

    /**
     * Scrape students from a SUAP subject
     * Also extracts professor information from the subject page
     * @param {string} subjectId - The SUAP subject ID (diario ID)
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Object with students array and professors array
     */
    async scrapeStudents(subjectId, progressCallback = null) {
        const normalizedSubjectId = String(subjectId);

        const cachedStudents = this.#studentsBySubjectCache.get(normalizedSubjectId);
        const cachedProfessors = this.#professorsBySubjectCache.get(normalizedSubjectId);
        if (cachedStudents && cachedProfessors) {
            if (progressCallback) progressCallback('Using cached students and professors');
            return {
                students: this.#cloneCollection(cachedStudents),
                professors: this.#cloneCollection(cachedProfessors),
            };
        }

        await SUAPScraper.initialize();

        // Step 1: Go to subject main page first to extract professors
        const mainUrl = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/`;
        
        if (progressCallback) progressCallback(`Loading subject page...`);
        await SUAPScraper.goto(mainUrl, '.title-container');

        console.log(`Scraping professors for subject ${subjectId}...`);

        // Extract professor info from the "Professores" box table
        // The table has columns: Ações, Matrícula, Nome, Campus, Tipo, Carga Horária, Ativo, Período da Posse
        const basicProfessors = await SUAPScraper.evaluate(() => {
            const professors = [];
            
            // Find the "Professores" box by looking for h3 with that text
            const boxes = document.querySelectorAll('.box');
            for (const box of boxes) {
                const title = box.querySelector('h3')?.textContent?.trim();
                if (title === 'Professores') {
                    // Found the professors box - get the table rows
                    const rows = box.querySelectorAll('table tbody tr');
                    rows.forEach((tr) => {
                        const cells = tr.querySelectorAll('td');
                        if (cells.length >= 3) {
                            // cells[1] = Matrícula (SIAPE), cells[2] = Nome
                            const siape = cells[1]?.textContent?.trim();
                            const name = cells[2]?.textContent?.trim();
                            if (siape && name && !professors.find(p => p.siape === siape)) {
                                professors.push({ siape, name });
                            }
                        }
                    });
                    break;
                }
            }
            return professors;
        });

        console.log(`Found ${basicProfessors.length} professors`);

        // Step 2: Get student list from notas_faltas tab
        const tab = suapConfig.subjectDetail.tab;
        const url = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/?tab=${tab}`;
        
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
        if (progressCallback) progressCallback(`Found ${basicStudents.length} students, ${basicProfessors.length} professors. Fetching emails...`);

        // Step 3: Fetch email for each professor from their profile page
        const professors = [];
        for (let i = 0; i < basicProfessors.length; i++) {
            const professor = basicProfessors[i];
            
            if (progressCallback) {
                progressCallback(`Fetching email for professor ${i + 1}/${basicProfessors.length}:\n${professor.name}`);
            }
            
            const email = await this.#fetchProfessorEmail(professor.siape);
            professors.push({
                id: this.#buildProfessorId(email),
                name: professor.name,
                email,
                siape: professor.siape,
            });
        }

        // Step 4: Fetch email for each student from their profile page
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

        console.log(`Completed fetching ${students.length} students and ${professors.length} professors with emails`);
        if (progressCallback) progressCallback(`Completed. Saving ${students.length} students and ${professors.length} professors...`);

        // Save students and professors to file
        await this.#saveStudents(normalizedSubjectId, students);
        await this.#saveProfessors(normalizedSubjectId, professors);

        this.#studentsBySubjectCache.set(normalizedSubjectId, this.#cloneCollection(students));
        this.#professorsBySubjectCache.set(normalizedSubjectId, this.#cloneCollection(professors));

        return { students, professors };
    }

    #getYearOffset(year) {
        // 2018 === 65
        return parseInt(year) - 1953;
    }

    /**
     * Save students to JSON file
     * @param {string} subjectId - The SUAP subject ID
     * @param {Array} students - Array of student objects
     */
    async #saveStudents(subjectId, students) {
        const data = this.#loadStudentsData();
        
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

    #loadStudentsData() {
        const data = {
            subjects: {},
            students: {},
            manualEnrollments: {},
        };

        if (!fs.existsSync(this.#studentsPath)) {
            return data;
        }

        try {
            const content = fs.readFileSync(this.#studentsPath, 'utf-8');
            const existingData = JSON.parse(content);

            data.subjects = existingData.subjects || {};
            data.students = existingData.students || {};
            data.manualEnrollments = Object.fromEntries(
                Object.entries(existingData.manualEnrollments || {}).map(([enrollment, manualEnrollment]) => [
                    enrollment,
                    this.#normalizeManualEnrollment(manualEnrollment),
                ])
            );
        } catch (error) {
            console.error('Error reading existing students file:', error.message);
        }

        return data;
    }

    #normalizeManualEnrollment(manualEnrollment = {}) {
        const rawCourseIds = Array.isArray(manualEnrollment.courseIds)
            ? manualEnrollment.courseIds
            : Array.isArray(manualEnrollment.courses)
                ? manualEnrollment.courses
                : [];

        return {
            password: typeof manualEnrollment.password === 'string'
                ? manualEnrollment.password.trim()
                : '',
            courseIds: Array.from(new Set(
                rawCourseIds
                    .map(courseId => String(courseId || '').trim())
                    .filter(Boolean)
            )),
        };
    }

    /**
     * Scrape only students from a SUAP subject (without professors)
     * @param {string} subjectId - The SUAP subject ID (diario ID)
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Array>} Array of student objects with name, email, and enrollment
     */
    async scrapeStudentsOnly(subjectId, progressCallback = null) {
        const normalizedSubjectId = String(subjectId);

        const cachedStudents = this.#studentsBySubjectCache.get(normalizedSubjectId);
        if (cachedStudents) {
            if (progressCallback) progressCallback('Using cached students');
            return this.#cloneCollection(cachedStudents);
        }

        await SUAPScraper.initialize();

        // Navigate directly to notas_faltas tab for students
        const tab = suapConfig.subjectDetail.tab;
        const url = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/?tab=${tab}`;
        
        if (progressCallback) progressCallback(`Loading students page...`);
        await SUAPScraper.goto(url, suapConfig.subjectDetail.ready);

        console.log(`Scraping students only for subject ${subjectId}...`);

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

        // Fetch email for each student from their profile page
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
        if (progressCallback) progressCallback(`Completed. Saving ${students.length} students...`);

        // Save only students to file
        await this.#saveStudents(normalizedSubjectId, students);
        this.#studentsBySubjectCache.set(normalizedSubjectId, this.#cloneCollection(students));

        return students;
    }

    /**
     * Fetch a student's profile from SUAP
     * @param {string} enrollment - Student enrollment ID
     * @returns {Promise<Object>} Student profile with enrollment, name and email
     */
    async fetchStudentProfile(enrollment) {
        const normalizedEnrollment = String(enrollment || '').trim();

        if (!normalizedEnrollment) {
            throw new Error('Student enrollment is required');
        }

        if (this.#studentProfileCache.has(normalizedEnrollment)) {
            return {
                enrollment: normalizedEnrollment,
                ...this.#studentProfileCache.get(normalizedEnrollment),
            };
        }

        await SUAPScraper.initialize();

        const url = `${suapConfig.baseUrl}/${suapConfig.studentProfile.url}/${normalizedEnrollment}/`;
        await SUAPScraper.goto(url, suapConfig.studentProfile.ready);

        const profile = await SUAPScraper.evaluate((config) => {
            const getDefinitionValue = (labels) => {
                const normalizedLabels = labels.map(label => label.toLowerCase());
                const dtElements = document.querySelectorAll('dt');

                for (const dt of dtElements) {
                    const dtText = dt.textContent?.trim()?.toLowerCase();
                    if (!dtText || !normalizedLabels.includes(dtText)) {
                        continue;
                    }

                    const dd = dt.nextElementSibling;
                    if (dd && dd.tagName === 'DD') {
                        return dd.textContent.trim();
                    }
                }

                return '';
            };

            const headingElement = typeof document.querySelector === 'function'
                ? document.querySelector('.title-container h2, .title-container h3, h2, h1')
                : null;
            const name = getDefinitionValue(config.nameLabels)
                || headingElement?.textContent?.trim()
                || '';
            const email = getDefinitionValue([config.emailLabel]);

            return { name, email };
        }, {
            emailLabel: suapConfig.studentProfile.email.label,
            nameLabels: ['Nome', 'Nome Civil', 'Nome Completo'],
        });

        const normalizedProfile = typeof profile === 'string'
            ? {
                name: '',
                email: profile,
            }
            : {
                name: profile?.name || '',
                email: profile?.email || '',
            };

        this.#studentProfileCache.set(normalizedEnrollment, normalizedProfile);
        this.#studentEmailCache.set(normalizedEnrollment, normalizedProfile.email || null);

        return {
            enrollment: normalizedEnrollment,
            ...normalizedProfile,
        };
    }

    /**
     * Save a manual student enrollment for Moodle CSV generation
     * @param {Object} options - Manual student data
     * @param {string} options.enrollment - Student enrollment ID
     * @param {string} options.password - Moodle password to use in CSV rows
     * @param {string[]} options.courseIds - Moodle course shortnames/IDs
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Object>} Saved manual enrollment data
     */
    async addManualStudent({ enrollment, password, courseIds }, progressCallback = null) {
        const normalizedEnrollment = String(enrollment || '').trim();
        const normalizedPassword = String(password || '').trim();
        const normalizedCourseIds = Array.from(new Set(
            (Array.isArray(courseIds) ? courseIds : [])
                .map(courseId => String(courseId || '').trim())
                .filter(Boolean)
        ));

        if (!normalizedEnrollment) {
            throw new Error('Student enrollment is required');
        }

        if (!normalizedPassword) {
            throw new Error('Password is required');
        }

        if (normalizedCourseIds.length === 0) {
            throw new Error('At least one course ID is required');
        }

        if (progressCallback) progressCallback('Fetching student profile from SUAP');

        const studentsData = this.#loadStudentsData();
        const existingStudent = studentsData.students?.[normalizedEnrollment] || {};
        const profile = await this.fetchStudentProfile(normalizedEnrollment);
        const studentName = profile.name || existingStudent.name || '';
        const studentEmail = profile.email || existingStudent.email || '';

        if (!studentName) {
            throw new Error(`Could not find full name for ${normalizedEnrollment}`);
        }

        if (!studentEmail) {
            throw new Error(`Could not find academic email for ${normalizedEnrollment}`);
        }

        const existingManualEnrollment = this.#normalizeManualEnrollment(
            studentsData.manualEnrollments?.[normalizedEnrollment]
        );
        const mergedCourseIds = Array.from(new Set([
            ...existingManualEnrollment.courseIds,
            ...normalizedCourseIds,
        ]));

        studentsData.students[normalizedEnrollment] = {
            name: studentName,
            email: studentEmail,
        };
        studentsData.manualEnrollments[normalizedEnrollment] = {
            password: normalizedPassword,
            courseIds: mergedCourseIds,
        };

        fs.writeFileSync(this.#studentsPath, JSON.stringify(studentsData, null, 2));

        if (progressCallback) progressCallback(`Saved manual enrollment for ${normalizedEnrollment}`);

        return {
            enrollment: normalizedEnrollment,
            username: studentEmail.split('@')[0] || normalizedEnrollment,
            name: studentName,
            email: studentEmail,
            password: normalizedPassword,
            courseIds: mergedCourseIds,
        };
    }

    async removeManualStudent(enrollment) {
        const normalizedEnrollment = String(enrollment || '').trim();

        if (!normalizedEnrollment) {
            throw new Error('Student enrollment is required');
        }

        const studentsData = this.#loadStudentsData();
        const existingManualEnrollment = studentsData.manualEnrollments?.[normalizedEnrollment];

        if (!existingManualEnrollment) {
            throw new Error(`Manual enrollment not found for ${normalizedEnrollment}`);
        }

        delete studentsData.manualEnrollments[normalizedEnrollment];

        const isStillReferencedBySubject = Object.values(studentsData.subjects || {})
            .some(enrollments => Array.isArray(enrollments) && enrollments.includes(normalizedEnrollment));

        if (!isStillReferencedBySubject) {
            delete studentsData.students[normalizedEnrollment];
        }

        fs.writeFileSync(this.#studentsPath, JSON.stringify(studentsData, null, 2));

        return {
            enrollment: normalizedEnrollment,
            removed: true,
        };
    }

    /**
     * Fetch a student's email from their profile page
     * @param {string} enrollment - Student enrollment ID
     * @returns {Promise<string|null>} Student email or null if not found
     */
    async #fetchStudentEmail(enrollment) {
        if (this.#studentEmailCache.has(enrollment)) {
            return this.#studentEmailCache.get(enrollment);
        }
        
        try {
            const profile = await this.fetchStudentProfile(enrollment);
            const email = profile.email || null;
            this.#studentEmailCache.set(enrollment, email);
            return email;
        } catch (error) {
            console.error(`Error fetching email for ${enrollment}:`, error.message);
            this.#studentEmailCache.set(enrollment, null);
            return null;
        }
    }

    /**
     * Scrape professors from a SUAP subject
     * @param {string} subjectId - The SUAP subject ID (diario ID)
     * @param {Function} progressCallback - Optional callback for progress updates
    * @returns {Promise<Array>} Array of professor objects with id, name, email, and siape
     */
    async scrapeProfessors(subjectId, progressCallback = null) {
        const normalizedSubjectId = String(subjectId);

        const cachedProfessors = this.#professorsBySubjectCache.get(normalizedSubjectId);
        if (cachedProfessors) {
            if (progressCallback) progressCallback('Using cached professors');
            return this.#cloneCollection(cachedProfessors);
        }

        await SUAPScraper.initialize();

        // Step 1: Get professor list from subject page (main diario page)
        const url = `${suapConfig.baseUrl}/${suapConfig.subjectDetail.url}/${subjectId}/`;
        
        if (progressCallback) progressCallback(`Loading subject page...`);
        await SUAPScraper.goto(url, '.title-container');

        console.log(`Scraping professors for subject ${subjectId}...`);

        if (progressCallback) progressCallback(`Extracting professor list...`);
        
        // Extract professor info from the "Professores" box table
        // The table has columns: Ações, Matrícula, Nome, Campus, Tipo, Carga Horária, Ativo, Período da Posse
        const basicProfessors = await SUAPScraper.evaluate(() => {
            const professors = [];
            
            // Find the "Professores" box by looking for h3 with that text
            const boxes = document.querySelectorAll('.box');
            for (const box of boxes) {
                const title = box.querySelector('h3')?.textContent?.trim();
                if (title === 'Professores') {
                    // Found the professors box - get the table rows
                    const rows = box.querySelectorAll('table tbody tr');
                    rows.forEach((tr) => {
                        const cells = tr.querySelectorAll('td');
                        if (cells.length >= 3) {
                            // cells[1] = Matrícula (SIAPE), cells[2] = Nome
                            const siape = cells[1]?.textContent?.trim();
                            const name = cells[2]?.textContent?.trim();
                            if (siape && name && !professors.find(p => p.siape === siape)) {
                                professors.push({ siape, name });
                            }
                        }
                    });
                    break;
                }
            }
            return professors;
        });

        console.log(`Found ${basicProfessors.length} professors. Fetching emails...`);
        if (progressCallback) progressCallback(`Found ${basicProfessors.length} professors. Fetching emails...`);

        // Step 2: Fetch email for each professor from their profile page
        const professors = [];
        for (let i = 0; i < basicProfessors.length; i++) {
            const professor = basicProfessors[i];
            
            if (progressCallback) {
                progressCallback(`Fetching email for professor ${i + 1}/${basicProfessors.length}:\n${professor.name}`);
            }
            
            const email = await this.#fetchProfessorEmail(professor.siape);
            professors.push({
                id: this.#buildProfessorId(email),
                name: professor.name,
                email,
                siape: professor.siape,
            });
        }

        console.log(`Completed fetching ${professors.length} professors with emails`);
        if (progressCallback) progressCallback(`Completed fetching ${professors.length} professors. Saving...`);

        // Save professors to file
        await this.#saveProfessors(normalizedSubjectId, professors);
        this.#professorsBySubjectCache.set(normalizedSubjectId, this.#cloneCollection(professors));

        return professors;
    }

    /**
     * Fetch a professor's email from their profile page
     * @param {string} siape - Professor SIAPE ID
     * @returns {Promise<string|null>} Professor email or null if not found
     */
    async #fetchProfessorEmail(siape) {
        if (this.#professorEmailCache.has(siape)) {
            return this.#professorEmailCache.get(siape);
        }

        const url = `${suapConfig.baseUrl}/${suapConfig.professorProfile.url}/${siape}/`;
        
        try {
            await SUAPScraper.goto(url, suapConfig.professorProfile.ready);
            
            const email = await SUAPScraper.evaluate((config) => {
                // Find the dt element with "E-mail" text (could be "E-mail Institucional" or others)
                const dtElements = document.querySelectorAll('dt');
                for (const dt of dtElements) {
                    const dtText = dt.textContent.trim();
                    // Check for exact match first, then partial match for email labels
                    if (dtText === config.emailLabel || dtText.toLowerCase().includes('e-mail')) {
                        // Get the next sibling dd element
                        const dd = dt.nextElementSibling;
                        if (dd && dd.tagName === 'DD') {
                            const emailText = dd.textContent.trim();
                            // Validate it looks like an email
                            if (emailText && emailText.includes('@')) {
                                return emailText;
                            }
                        }
                    }
                }
                return null;
            }, { emailLabel: suapConfig.professorProfile.email.label });
            
            this.#professorEmailCache.set(siape, email);
            return email;
        } catch (error) {
            console.error(`Error fetching email for professor ${siape}:`, error.message);
            this.#professorEmailCache.set(siape, null);
            return null;
        }
    }

    #cloneCollection(collection) {
        return collection.map(item => ({ ...item }));
    }

    #buildProfessorId(email) {
        if (typeof email !== 'string') {
            return '';
        }

        return email.split('@')[0]?.trim() || '';
    }

    #normalizeProfessorRecord(professor = {}) {
        return {
            id: professor.id || this.#buildProfessorId(professor.email),
            name: professor.name || '',
            email: professor.email ?? '',
        };
    }

    /**
     * Save professors to JSON file
     * @param {string} subjectId - The SUAP subject ID
     * @param {Array} professors - Array of professor objects
     */
    async #saveProfessors(subjectId, professors) {
        let data = {
            subjects: {},
            professors: {}
        };
        
        // Load existing data if file exists
        if (fs.existsSync(this.#professorsPath)) {
            try {
                const content = fs.readFileSync(this.#professorsPath, 'utf-8');
                const existingData = JSON.parse(content);
                // Ensure structure exists (handle legacy format)
                data.subjects = existingData.subjects || {};
                data.professors = Object.fromEntries(
                    Object.entries(existingData.professors || {}).map(([siape, professor]) => [
                        siape,
                        this.#normalizeProfessorRecord(professor)
                    ])
                );
            } catch (error) {
                console.error('Error reading existing professors file:', error.message);
            }
        }
        
        // Store SIAPE list for this subject
        const siapes = professors.map(p => p.siape);
        data.subjects[subjectId] = siapes;
        
        // Add/update professor info (deduplicated by SIAPE)
        professors.forEach(professor => {
            data.professors[professor.siape] = this.#normalizeProfessorRecord(professor);
        });
        
        // Write back to file
        fs.writeFileSync(this.#professorsPath, JSON.stringify(data, null, 2));
        console.log(`Saved ${professors.length} professors to ${this.#professorsPath}`);
    }
}

export { SUAP };
