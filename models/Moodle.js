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
        const timetables = new TimeTables();
        
        // Fetch data from EduPage
        const classes = await timetables.getClasses(year, semester, dateFrom, dateTo);
        const subjects = await timetables.getSubjects();
        const teachers = await timetables.getTeachers();

        // Build CSV
        const csvLines = ['shortname,fullname,category'];
        
        for (const cls of classes) {
            const subject = subjects.find(s => s.id === cls.subjectId);
            const teacher = teachers.find(t => t.id === cls.teacherId);
            
            if (!subject) continue;

            const category = this.#getCategoryForClass(cls.name);
            const shortname = this.#buildShortname(cls, subject, year, semester);
            const fullname = this.#buildFullname(cls, subject, year, semester);

            csvLines.push(`${shortname},${fullname},${category}`);
        }

        const csv = csvLines.join('\n');
        
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
     * Get category ID for class name
     * @private
     */
    #getCategoryForClass(className) {
        for (const [prefix, categoryId] of Object.entries(moodleConfig.categories)) {
            if (className.startsWith(prefix)) {
                return categoryId;
            }
        }
        return moodleConfig.categories.default || 1;
    }

    /**
     * Build course shortname
     * @private
     */
    #buildShortname(cls, subject, year, semester) {
        const classShort = cls.name.replace(/[^A-Z0-9]/g, '_');
        const subjectShort = subject.shortname || subject.name.substring(0, 6);
        const group = cls.group || 'G1';
        
        return `CH_${classShort}_${subjectShort}_${year}.${semester}_${group}`;
    }

    /**
     * Build course fullname
     * @private
     */
    #buildFullname(cls, subject, year, semester) {
        return `[${year}.${semester}] ${cls.name} - ${subject.name}`;
    }

    /**
     * Parse CSV content to course objects
     * @private
     */
    #parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        
        // Skip header
        return lines.slice(1).map(line => {
            const [shortname, fullname, category] = line.split(',');
            return {
                shortname: shortname?.trim(),
                fullname: fullname?.trim(),
                categoryid: parseInt(category?.trim()) || 1
            };
        }).filter(c => c.shortname && c.fullname);
    }
}
