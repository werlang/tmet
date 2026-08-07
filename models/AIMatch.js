import { ChatAssist } from '../helpers/chat-assist.js';
import { chatAssistConfig } from '../config/chat-assist.js';

/**
 * AIMatch Model
 * Handles AI-powered matching operations
 */
class AIMatch {
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

        const systemPrompt = chatAssistConfig.systemPrompt;
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
            let cleaned = response.trim();
            if (cleaned.toLowerCase() === 'null') {
                return matches;
            }

            // Remove markdown code fences if present (e.g. ```json ... ```)
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

            // First try parsing as a single JSON structure (e.g., Array of matches)
            try {
                const parsedJSON = JSON.parse(cleaned);
                const list = Array.isArray(parsedJSON) ? parsedJSON : [parsedJSON];
                for (const item of list) {
                    if (item && item.moodleFullname && item.suapIds && typeof item.confidence === 'number') {
                        matches.push(item);
                    }
                }
                if (matches.length > 0) {
                    return matches;
                }
            } catch (e) {
                // Not a single valid JSON block, fall back to line-by-line parsing
            }

            // Parse JSONL format (one JSON object per line)
            const lines = cleaned.split('\n');
            for (const line of lines) {
                let trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                // Remove trailing comma if present (e.g. inside formatted JSON list)
                if (trimmedLine.endsWith(',')) {
                    trimmedLine = trimmedLine.slice(0, -1).trim();
                }

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

export { AIMatch };
