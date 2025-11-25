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
}
