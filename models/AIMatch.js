import ChatAssist from '../helpers/chat-assist.js';
import chatConfig from '../config/chat-assist.js';

/**
 * AIMatch Model
 * Handles AI-powered matching operations
 */
export default class AIMatch {
    #chatAssist;

    constructor() {
        this.#chatAssist = new ChatAssist();
    }

    /**
     * Find matches between Moodle and SUAP subjects using AI
     * @param {Array} moodleSubjects - Moodle subjects to match
     * @param {Array} suapSubjects - SUAP subjects to match
     * @param {Function} progressCallback - Progress update callback
     * @returns {Promise<Array>} Array of matches with confidence scores
     */
    async findMatches(moodleSubjects, suapSubjects, progressCallback) {
        // Update progress
        progressCallback?.({ message: 'Preparing AI prompt...' });

        const systemPrompt = chatConfig.systemPrompt;
        const userMessage = this.#buildPrompt(moodleSubjects, suapSubjects);

        // Call AI
        progressCallback?.({ message: 'Analyzing subjects with AI...' });
        
        const response = await this.#chatAssist.chat(userMessage, systemPrompt, {
            temperature: 0.3,
            maxTokens: 4096,
        });

        // Parse response
        progressCallback?.({ message: 'Parsing AI response...' });
        
        const matches = this.#parseResponse(response);
        const filteredMatches = matches.filter(m => m.confidence > 0.8);

        return filteredMatches;
    }

    /**
     * Build AI prompt
     * @private
     */
    #buildPrompt(moodleSubjects, suapSubjects) {
        const moodleList = moodleSubjects
            .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
            .join('\n');

        const suapList = suapSubjects
            .map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`)
            .join('\n');

        return `Find matches between these Moodle and SUAP subjects:

MOODLE SUBJECTS:
${moodleList}

SUAP SUBJECTS:
${suapList}`;
    }

    /**
     * Parse AI response to extract matches (JSONL format - one JSON per line)
     * @private
     */
    #parseResponse(response) {
        const matches = [];

        try {
            // Handle 'null' response (no confident matches)
            if (response.trim().toLowerCase() === 'null') {
                return matches;
            }

            // Parse JSONL format (one JSON object per line)
            const lines = response.trim().split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;

                try {
                    const parsed = JSON.parse(trimmedLine);
                    // Validate expected structure
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    console.warn('Failed to parse JSONL line:', trimmedLine);
                }
            }
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            throw new Error('AI returned invalid response format');
        }

        return matches;
    }
}
