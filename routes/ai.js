import express from 'express';
import ChatAssist from '../helpers/chat-assist.js';
import chatConfig from '../config/chat-assist.js';

const router = express.Router();

/**
 * POST /ai/match
 * Start AI matching process (long-running operation, returns job ID)
 */
router.post('/match', async (req, res) => {
    try {
        const { moodleSubjects, suapSubjects } = req.body;
        
        if (!moodleSubjects || !suapSubjects) {
            return res.status(400).json({ 
                success: false, 
                error: 'moodleSubjects and suapSubjects are required' 
            });
        }

        console.log(`Starting AI matching for ${moodleSubjects.length} Moodle subjects and ${suapSubjects.length} SUAP subjects...`);

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processAIMatching(jobId, moodleSubjects, suapSubjects, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'AI matching job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('AI matching error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Async function to process AI matching
async function processAIMatching(jobId, moodleSubjects, suapSubjects, updateProgress) {
    const chatAssist = new ChatAssist();
    
    // Update progress
    updateProgress({
        message: 'Preparing AI prompt...'
    });
    
    // Build the prompt for AI matching
    const systemPrompt = chatConfig.systemPrompt;

    const userMessage = `Find matches between these Moodle and SUAP subjects:

MOODLE SUBJECTS:
${moodleSubjects.map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`).join('\n')}

SUAP SUBJECTS:
${suapSubjects.map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`).join('\n')}`;

    // Update progress
    updateProgress({
        message: 'Analyzing subjects with AI...'
    });

    const response = await chatAssist.chat(userMessage, systemPrompt, {
        temperature: 0.3,
        maxTokens: 4096,
    });
    console.log(response);

    // Update progress
    updateProgress({
        message: 'Parsing AI response...'
    });

    // Parse the AI response
    let matches = [];
    try {
        const jsonMatch = response.match(/\{[\s\S]*?\}/g);
        if (jsonMatch) {
            matches = jsonMatch.map(line => JSON.parse(line));
        } else {
            console.warn(`[${jobId}] AI response did not contain valid JSON array`);
        }
    } catch (parseError) {
        console.error(`[${jobId}] Failed to parse AI response:`, parseError);
        throw new Error('AI returned invalid response format');
    }

    const filteredMatches = matches.filter(m => m.confidence > 0.8);
    console.log(`[${jobId}] AI suggested ${filteredMatches.length} high-confidence matches`);

    // Return results
    return {
        matches: filteredMatches,
        message: 'AI matching completed'
    };
}

export default router;
