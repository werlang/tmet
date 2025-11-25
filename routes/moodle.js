import express from 'express';
import Moodle from '../models/Moodle.js';

const router = express.Router();

/**
 * POST /moodle/csv
 * Generate CSV from timetables
 */
router.post('/csv', async (req, res) => {
    try {
        const params = {
            year: req.body.year || new Date().getFullYear(),
            semester: req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
            dateFrom: req.body.dateFrom,
            dateTo: req.body.dateTo
        };

        console.log('Starting Moodle CSV generation job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processGenerateCSV(jobId, params, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('CSV generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /moodle/courses
 * Upload courses to Moodle
 */
router.post('/courses', async (req, res) => {
    try {
        console.log('Starting Moodle course upload job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processUploadCourses(jobId, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'Course upload job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Error uploading courses:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Async function to process CSV generation
async function processGenerateCSV(jobId, params, updateProgress) {
    updateProgress({
        message: 'Starting CSV generation...'
    });

    console.log(`[${jobId}] Starting CSV generation with params:`, params);
    
    const moodle = new Moodle();
    await moodle.generateCSV(params, (message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] CSV generation completed`);

    return {
        message: 'Moodle CSV generated successfully',
        file: 'files/moodle_classes.csv'
    };
}

// Async function to process course upload
async function processUploadCourses(jobId, updateProgress) {
    updateProgress({
        message: 'Starting course upload...'
    });

    console.log(`[${jobId}] Starting course upload`);
    
    const moodle = new Moodle();
    const results = await moodle.uploadCourses((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Course upload completed`);

    return {
        message: 'Courses uploaded successfully',
        results
    };
}

export default router;
