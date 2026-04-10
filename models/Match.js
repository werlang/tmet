import path from 'path';
import fs from 'fs';

/**
 * Match Model
 * Handles matching operations between Moodle and SUAP subjects
 * Uses unified matches.json for both auto and manual matches
 */
class Match {
    #matchesPath;
    #moodleClassesPath;
    #manualMoodleClassesPath;
    #suapSubjectsPath;

    constructor() {
        this.#matchesPath = path.resolve('files', 'matches.json');
        this.#moodleClassesPath = path.resolve('files', 'moodle_classes.csv');
        this.#manualMoodleClassesPath = path.resolve('files', 'moodle_manual_classes.csv');
        this.#suapSubjectsPath = path.resolve('files', 'suap_subjects.json');
    }

    /**
     * Get all matching data (matched and unmatched subjects)
     * Auto-matches are computed and recorded in the unified matches.json
     * @returns {Object} Matching data
     */
    getAll() {
        const suapSubjects = this.#loadSuapSubjects();
        const moodleSubjects = this.#loadMoodleSubjects();
        const existingMatches = this.#loadMatches();

        const noMatch = [];
        const newAutoMatches = [];

        // Try to match Moodle subjects with SUAP subjects
        for (const msubject of moodleSubjects) {
            // Check for existing match first (manual or auto)
            const existingMatch = existingMatches.find(m => m.moodleFullname === msubject.fullname);
            if (existingMatch) {
                msubject.suapId = existingMatch.suapId; // Can be string or array
                msubject.matchType = existingMatch.type;

                // Handle both single and multiple matches
                if (Array.isArray(existingMatch.suapId)) {
                    msubject.suapMatch = existingMatch.suapId
                        .map(id => suapSubjects.find(s => s.id === id))
                        .filter(s => s);
                } else {
                    const suapSubject = suapSubjects.find(s => s.id === existingMatch.suapId);
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
                msubject.matchType = 'auto';
                
                // Record auto-match for persistence
                newAutoMatches.push({
                    moodleFullname: msubject.fullname,
                    suapId: match.id,
                    type: 'auto'
                });
            } else {
                noMatch.push(msubject);
            }
        }

        // Save new auto-matches to the unified file
        if (newAutoMatches.length > 0) {
            this.#saveAutoMatches(newAutoMatches);
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
     * Get all stored matches from unified file
     * @returns {Array} All matches (auto and manual)
     */
    getAllMatches() {
        return this.#loadMatches();
    }

    /**
     * Create a manual match between Moodle and SUAP subjects
     * Overwrites any existing match (auto or manual) for this Moodle subject
     * @param {string} moodleFullname - Moodle subject fullname
     * @param {string|string[]} suapId - SUAP ID(s) to match
     * @returns {boolean} Success status
     */
    create(moodleFullname, suapId) {
        let matches = this.#loadMatches();

        // Remove existing match for this moodle subject (auto or manual)
        matches = matches.filter(m => m.moodleFullname !== moodleFullname);

        // Add new manual match
        matches.push({ moodleFullname, suapId, type: 'manual' });

        this.#saveMatches(matches);
        return true;
    }

    /**
     * Load Moodle subjects from CSV
     * @private
     */
    #loadMoodleSubjects() {
        const seenFullnames = new Set();
        const subjects = [];

        [this.#moodleClassesPath, this.#manualMoodleClassesPath].forEach(filePath => {
            if (!fs.existsSync(filePath)) {
                return;
            }

            const csv = fs.readFileSync(filePath, 'utf-8');
            const lines = csv.split('\n').slice(1);

            lines
                .map(line => {
                    const match = line?.match(/"(.+)",\s*(.+),\s*(\d+)/);
                    if (!match) return null;
                    return {
                        fullname: match[1],
                        shortname: match[2],
                        category: match[3]
                    };
                })
                .filter(Boolean)
                .forEach(subject => {
                    if (seenFullnames.has(subject.fullname)) {
                        return;
                    }

                    seenFullnames.add(subject.fullname);
                    subjects.push(subject);
                });
        });

        return subjects;
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
     * Load matches from unified JSON file
     * @private
     */
    #loadMatches() {
        if (!fs.existsSync(this.#matchesPath)) {
            return [];
        }

        return JSON.parse(fs.readFileSync(this.#matchesPath, 'utf-8'));
    }

    /**
     * Save all matches to unified JSON file
     * @private
     */
    #saveMatches(matches) {
        fs.writeFileSync(this.#matchesPath, JSON.stringify(matches, null, 2));
    }

    /**
     * Save new auto-matches without overwriting existing matches
     * @param {Array} autoMatches - New auto-matches to add
     * @private
     */
    #saveAutoMatches(autoMatches) {
        let matches = this.#loadMatches();
        
        // Only add auto-matches that don't already exist
        for (const autoMatch of autoMatches) {
            const exists = matches.find(m => m.moodleFullname === autoMatch.moodleFullname);
            if (!exists) {
                matches.push(autoMatch);
            }
        }
        
        this.#saveMatches(matches);
    }
}

export { Match };
