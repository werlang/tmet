import path from 'path';
import fs from 'fs';

/**
 * Match Model
 * Handles matching operations between Moodle and SUAP subjects
 */
export default class Match {
    #manualMatchesPath;
    #moodleClassesPath;
    #suapSubjectsPath;

    constructor() {
        this.#manualMatchesPath = path.resolve('files', 'manual_matches.json');
        this.#moodleClassesPath = path.resolve('files', 'moodle_classes.csv');
        this.#suapSubjectsPath = path.resolve('files', 'suap_subjects.json');
    }

    /**
     * Get all matching data (matched and unmatched subjects)
     * @returns {Object} Matching data
     */
    getAll() {
        const suapSubjects = this.#loadSuapSubjects();
        const moodleSubjects = this.#loadMoodleSubjects();
        const manualMatches = this.#loadManualMatches();

        const noMatch = [];

        // Try to match Moodle subjects with SUAP subjects
        for (const msubject of moodleSubjects) {
            // Check for manual match first
            const manualMatch = manualMatches.find(m => m.moodleFullname === msubject.fullname);
            if (manualMatch) {
                msubject.suapId = manualMatch.suapId; // Can be string or array

                // Handle both single and multiple matches
                if (Array.isArray(manualMatch.suapId)) {
                    msubject.suapMatch = manualMatch.suapId
                        .map(id => suapSubjects.find(s => s.id === id))
                        .filter(s => s);
                } else {
                    const suapSubject = suapSubjects.find(s => s.id === manualMatch.suapId);
                    if (suapSubject) {
                        msubject.suapMatch = suapSubject;
                    }
                }
                continue;
            }

            // Parse Moodle fullname
            // $1 = className (e.g., INF-1AT)
            // $2 = group (e.g., -G1) optional
            // $3 = secondary className (e.g., , INF-1BT) optional
            // $4 = subjectName (e.g., Banco de Dados)
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const moodleName = msubject.fullname.match(regex);
            
            if (!moodleName) {
                noMatch.push(msubject);
                continue;
            }

            msubject.className = moodleName[1];
            msubject.secondaryClassName = moodleName[3] ? moodleName[3].replace(',', '').trim() : null;
            msubject.subjectName = moodleName[4].replace(/\s+/g, ' ').trim();
            msubject.group = moodleName[2] ? moodleName[2].replace('-', '') : false;

            // Find matching SUAP subject
            const match = suapSubjects.find(ssubject =>
                ssubject.className === msubject.className &&
                ssubject.subjectName === msubject.subjectName &&
                ssubject.group === msubject.group
            );

            if (match) {
                msubject.suapId = match.id;
                msubject.suapMatch = match;
            } else {
                noMatch.push(msubject);
            }
        }

        const matching = moodleSubjects.filter(m => m.suapId).length;
        console.log(`Found ${matching} / ${moodleSubjects.length} matching subjects.`);

        return {
            subjects: moodleSubjects,
            noMatch,
            suapSubjects
        };
    }

    /**
     * Create a manual match between Moodle and SUAP subjects
     * @param {string} moodleFullname - Moodle subject fullname
     * @param {string|string[]} suapId - SUAP ID(s) to match
     * @returns {boolean} Success status
     */
    create(moodleFullname, suapId) {
        let manualMatches = this.#loadManualMatches();

        // Remove existing match for this moodle subject
        manualMatches = manualMatches.filter(m => m.moodleFullname !== moodleFullname);

        // Add new match
        manualMatches.push({ moodleFullname, suapId });

        this.#saveManualMatches(manualMatches);
        return true;
    }

    /**
     * Load Moodle subjects from CSV
     * @private
     */
    #loadMoodleSubjects() {
        if (!fs.existsSync(this.#moodleClassesPath)) {
            return [];
        }

        const csv = fs.readFileSync(this.#moodleClassesPath, 'utf-8');
        const lines = csv.split('\n').slice(1); // Skip header
        
        return lines
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
    }

    /**
     * Load SUAP subjects from JSON
     * @private
     */
    #loadSuapSubjects() {
        if (!fs.existsSync(this.#suapSubjectsPath)) {
            return [];
        }

        return JSON.parse(fs.readFileSync(this.#suapSubjectsPath, 'utf-8'));
    }

    /**
     * Load manual matches from JSON
     * @private
     */
    #loadManualMatches() {
        if (!fs.existsSync(this.#manualMatchesPath)) {
            return [];
        }

        return JSON.parse(fs.readFileSync(this.#manualMatchesPath, 'utf-8'));
    }

    /**
     * Save manual matches to JSON
     * @private
     */
    #saveManualMatches(matches) {
        fs.writeFileSync(this.#manualMatchesPath, JSON.stringify(matches, null, 2));
    }
}
