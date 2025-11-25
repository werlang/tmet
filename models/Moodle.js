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
     * @returns {Promise<string>} CSV content
     */
    async generateCSV({ year, semester, dateFrom, dateTo }) {
        const moodleSubjects = [];

        const tt = new TimeTables({
            year,
            dateFrom,
            dateTo,
        });

        const classes = await tt.getClasses();

        for (const c of classes) {
            c.subjects?.forEach(s => {
                const subjectObj = s.subject;

                // Determine group suffix
                const group = s.groupnames.includes('Grupo 1') 
                    ? '_G1' 
                    : s.groupnames.includes('Grupo 2') 
                        ? '_G2' 
                        : '';

                // Build class name (handles multiple classes)
                const className = s.classids.length > 1 
                    ? classes.filter(cl => s.classids.includes(cl.id)).map(cl => cl.name).join(',')
                    : c.name;

                // Build fullname and shortname
                // "[2025.2] TSI-2AN - Desenvolvimento Back-end I", CH_TSI_2AN_DBE1_2025.2, 120
                const fullName = `"[${year}.${semester}] ${className}${group.replace('_', '-')} - ${subjectObj.name.split('-').slice(1).join('-').trim()}"`;
                const shortName = `CH_${className.replace(/[-,]/g, '_')}_${subjectObj.short.split(/\s*-\s*/)?.slice(1).join('')}_${year}.${semester}${group}`;
                const category = moodleConfig.categories[c.name.split('-')[0]];

                // Avoid duplicates and ensure category exists
                if (!moodleSubjects.map(ms => ms[0]).includes(fullName) && category) {
                    moodleSubjects.push([fullName, shortName, category]);
                }
            });
        }

        console.log(`Generated ${moodleSubjects.length} Moodle subjects.`);

        // Build CSV with header
        const header = ['fullname', 'shortname', 'category'];
        moodleSubjects.unshift(header);
        const csv = moodleSubjects.map(ms => ms.join(', ')).join('\n');

        // Save to file
        fs.writeFileSync(this.#csvPath, csv);

        return csv;
    }

    /**
     * Upload courses to Moodle
     * @returns {Promise<Object>} Upload results
     */
    async uploadCourses() {
        if (!fs.existsSync(this.#csvPath)) {
            throw new Error('CSV file not found. Generate CSV first.');
        }

        const uploader = new MoodleUploader();
        const csv = fs.readFileSync(this.#csvPath, 'utf-8');
        
        const courses = this.#parseCSV(csv);
        const results = await uploader.createCourses(courses);

        return results;
    }

    /**
     * Parse CSV content to course objects
     * @private
     */
    #parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        
        // Skip header
        return lines.slice(1).map(line => {
            const match = line.match(/"(.+)", (.+), (\d+)/);
            if (!match) return null;
            return {
                fullname: match[1],
                shortname: match[2],
                categoryid: parseInt(match[3]) || 1
            };
        }).filter(c => c !== null);
    }
}
