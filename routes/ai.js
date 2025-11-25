import express from 'express';
import AIMatch from '../models/AIMatch.js';

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
    console.log(`[${jobId}] Starting AI matching`);
    
    const aiMatch = new AIMatch();
    const matches = await aiMatch.findMatches(moodleSubjects, suapSubjects, updateProgress);

    console.log(`[${jobId}] AI suggested ${matches.length} high-confidence matches`);

    return {
        matches,
        message: 'AI matching completed'
    };
}

export default router;
