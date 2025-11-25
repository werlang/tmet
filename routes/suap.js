import express from 'express';
import SUAP from '../models/SUAP.js';

const router = express.Router();

/**
 * POST /suap/extract
 * Extract SUAP subjects (long-running operation, returns job ID)
 */
router.post('/extract', async (req, res) => {
    try {
        const params = {
            year: req.body.year || new Date().getFullYear(),
            semester: req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
            courses: req.body.courses || undefined
        };

        console.log('Starting SUAP extraction job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processExtractSUAP(jobId, params, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'SUAP extraction job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('SUAP extraction error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Async function to process SUAP extraction
async function processExtractSUAP(jobId, params, updateProgress) {
    updateProgress({
        message: 'Starting SUAP extraction...'
    });

    console.log(`[${jobId}] Starting SUAP extraction with params:`, params);
    
    const suap = new SUAP();
    await suap.extractSubjects(params, (message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] SUAP extraction completed`);

    return {
        message: 'SUAP data extracted successfully',
        file: 'files/suap_subjects.json'
    };
}

export default router;
