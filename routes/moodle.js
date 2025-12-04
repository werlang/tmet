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
 * Upload courses to Moodle (production only)
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

/**
 * POST /moodle/students-csv
 * Generate students CSV for Moodle bulk enrollment
 */
router.post('/students-csv', async (req, res) => {
    try {
        console.log('Starting students CSV generation job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processGenerateStudentsCSV(jobId, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'Students CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Students CSV generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /moodle/professors-csv
 * Generate professors CSV for Moodle bulk enrollment
 */
router.post('/professors-csv', async (req, res) => {
    try {
        console.log('Starting professors CSV generation job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processGenerateProfessorsCSV(jobId, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'Professors CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Professors CSV generation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /moodle/students
 * Upload students to Moodle
 */
router.post('/students', async (req, res) => {
    try {
        console.log('Starting Moodle student upload job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processUploadStudents(jobId, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'Student upload job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Error uploading students:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /moodle/professors
 * Upload professors to Moodle
 */
router.post('/professors', async (req, res) => {
    try {
        console.log('Starting Moodle professor upload job...');

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processUploadProfessors(jobId, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({ 
            success: true,
            jobId,
            message: 'Professor upload job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Error uploading professors:', error);
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
    await moodle.generateCourseCSV(params, (message) => {
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

    // Generate appropriate message based on results
    const successCount = results.success?.length || 0;
    const errorCount = results.errors?.length || 0;
    let message;
    
    if (errorCount > 0 && successCount === 0) {
        message = `Course upload failed: ${results.errors[0]?.error || 'Unknown error'}`;
    } else if (errorCount > 0) {
        message = `Courses uploaded with errors: ${successCount} succeeded, ${errorCount} failed`;
    } else {
        message = `${successCount} courses uploaded successfully`;
    }

    return {
        message,
        results
    };
}

// Async function to process students CSV generation
async function processGenerateStudentsCSV(jobId, updateProgress) {
    updateProgress({
        message: 'Starting students CSV generation...'
    });

    console.log(`[${jobId}] Starting students CSV generation`);
    
    const moodle = new Moodle();
    const result = await moodle.generateStudentCSV((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Students CSV generation completed`);

    return {
        message: `Students CSV generated successfully. ${result.totalStudents} students from ${result.processedSubjects} subjects.`,
        file: 'files/moodle_students.csv',
        ...result
    };
}

// Async function to process professors CSV generation
async function processGenerateProfessorsCSV(jobId, updateProgress) {
    updateProgress({
        message: 'Starting professors CSV generation...'
    });

    console.log(`[${jobId}] Starting professors CSV generation`);
    
    const moodle = new Moodle();
    const result = await moodle.generateProfessorCSV((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Professors CSV generation completed`);

    return {
        message: `Professors CSV generated successfully. ${result.totalProfessors} professors from ${result.processedSubjects} subjects.`,
        file: 'files/moodle_professors.csv',
        ...result
    };
}

// Async function to process student upload
async function processUploadStudents(jobId, updateProgress) {
    updateProgress({
        message: 'Starting student upload...'
    });

    console.log(`[${jobId}] Starting student upload`);
    
    const moodle = new Moodle();
    const results = await moodle.uploadStudents((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Student upload completed`);

    // Generate appropriate message based on results
    const successCount = results.success?.length || 0;
    const errorCount = results.errors?.length || 0;
    const skippedCount = results.skipped?.length || 0;
    let message;
    
    if (errorCount > 0 && successCount === 0) {
        message = `Student upload failed: ${results.errors[0]?.error || 'Unknown error'}`;
    } else if (errorCount > 0 || skippedCount > 0) {
        message = `Students uploaded: ${successCount} enrolled, ${skippedCount} skipped, ${errorCount} errors`;
    } else {
        message = `${successCount} students enrolled successfully`;
    }

    return {
        message,
        results
    };
}

// Async function to process professor upload
async function processUploadProfessors(jobId, updateProgress) {
    updateProgress({
        message: 'Starting professor upload...'
    });

    console.log(`[${jobId}] Starting professor upload`);
    
    const moodle = new Moodle();
    const results = await moodle.uploadProfessors((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Professor upload completed`);

    // Generate appropriate message based on results
    const successCount = results.success?.length || 0;
    const errorCount = results.errors?.length || 0;
    const skippedCount = results.skipped?.length || 0;
    let message;
    
    if (errorCount > 0 && successCount === 0) {
        message = `Professor upload failed: ${results.errors[0]?.error || 'Unknown error'}`;
    } else if (errorCount > 0 || skippedCount > 0) {
        message = `Professors uploaded: ${successCount} enrolled, ${skippedCount} skipped, ${errorCount} errors`;
    } else {
        message = `${successCount} professors enrolled successfully`;
    }

    return {
        message,
        results
    };
}

export default router;
