import express from 'express';
import { Moodle } from '../models/Moodle.js';

const router = express.Router();

router.get('/course-categories', (req, res) => {
    try {
        const moodle = new Moodle();
        res.json({
            success: true,
            categories: moodle.getCourseCategories(),
        });
    } catch (error) {
        console.error('Error loading Moodle course categories:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.get('/manual-courses', (req, res) => {
    try {
        const moodle = new Moodle();
        res.json({
            success: true,
            courses: moodle.getManualCourses(),
        });
    } catch (error) {
        console.error('Error loading manual Moodle courses:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.post('/manual-courses', (req, res) => {
    const { fullname, categoryKey } = req.body;

    try {
        const moodle = new Moodle();
        const course = moodle.addManualCourse({ fullname, categoryKey });

        res.status(201).json({
            success: true,
            message: `Manual Moodle course queued: ${course.shortname}`,
            course,
        });
    } catch (error) {
        const statusCode = /required|format|exists|valid/i.test(error.message) ? 400 : 500;

        console.error('Error creating manual Moodle course:', error);
        res.status(statusCode).json({
            success: false,
            error: error.message,
        });
    }
});

router.post('/manual-courses/remove', (req, res) => {
    const { fullname } = req.body;

    try {
        const moodle = new Moodle();
        const result = moodle.removeManualCourse(fullname);

        res.json({
            success: true,
            message: `Manual Moodle course removed: ${fullname}`,
            ...result,
        });
    } catch (error) {
        const statusCode = /required|not found/i.test(error.message) ? 400 : 500;

        console.error('Error removing manual Moodle course:', error);
        res.status(statusCode).json({
            success: false,
            error: error.message,
        });
    }
});

router.post('/manual-courses-csv', async (req, res) => {
    try {
        console.log('Starting manual courses CSV generation job...');

        const jobQueue = req.app.locals.jobQueue;
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processGenerateManualCoursesCSV(jobId, updateProgress);
        });

        res.status(202).json({
            success: true,
            jobId,
            message: 'Manual courses CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    } catch (error) {
        console.error('Manual courses CSV generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

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
 * POST /moodle/manual-students-csv
 * Generate manual students CSV for Moodle bulk enrollment
 */
router.post('/manual-students-csv', async (req, res) => {
    try {
        console.log('Starting manual students CSV generation job...');

        const jobQueue = req.app.locals.jobQueue;
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processGenerateManualStudentsCSV(jobId, updateProgress);
        });

        res.status(202).json({
            success: true,
            jobId,
            message: 'Manual students CSV generation job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    } catch (error) {
        console.error('Manual students CSV generation error:', error);
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
        message: `Students CSV generated successfully. ${result.totalStudents} rows from ${result.processedSubjects} matched subjects.`,
        file: 'files/moodle_students.csv',
        ...result
    };
}

async function processGenerateManualStudentsCSV(jobId, updateProgress) {
    updateProgress({
        message: 'Starting manual students CSV generation...'
    });

    console.log(`[${jobId}] Starting manual students CSV generation`);

    const moodle = new Moodle();
    const result = await moodle.generateManualStudentCSV((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Manual students CSV generation completed`);

    return {
        message: `Manual students CSV generated successfully. ${result.totalStudents} rows from ${result.manualStudents} manual students.`,
        file: 'files/moodle_manual_students.csv',
        ...result
    };
}

async function processGenerateManualCoursesCSV(jobId, updateProgress) {
    updateProgress({
        message: 'Starting manual courses CSV generation...'
    });

    console.log(`[${jobId}] Starting manual courses CSV generation`);

    const moodle = new Moodle();
    const result = await moodle.generateManualCourseCSV((message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Manual courses CSV generation completed`);

    return {
        message: `Manual courses CSV generated successfully. ${result.totalCourses} courses queued.`,
        file: 'files/moodle_manual_classes.csv',
        ...result,
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

    const successCount = results.success?.length || 0;
    const errorCount = results.errors?.length || 0;
    const skippedCount = results.skipped?.length || 0;
    const createdCount = results.created?.length || 0;
    let message;

    if (errorCount > 0 && successCount === 0) {
        message = `Student upload failed: ${results.errors[0]?.error || 'Unknown error'}`;
    } else if (errorCount > 0 || skippedCount > 0) {
        message = `Students uploaded: ${successCount} enrolled${createdCount > 0 ? ` (${createdCount} new)` : ''}, ${skippedCount} skipped, ${errorCount} errors`;
    } else {
        message = `${successCount} students enrolled successfully${createdCount > 0 ? ` (${createdCount} new users created)` : ''}`;
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
    const createdCount = results.created?.length || 0;
    let message;
    
    if (errorCount > 0 && successCount === 0) {
        message = `Professor upload failed: ${results.errors[0]?.error || 'Unknown error'}`;
    } else if (errorCount > 0 || skippedCount > 0) {
        message = `Professors uploaded: ${successCount} enrolled${createdCount > 0 ? ` (${createdCount} new)` : ''}, ${skippedCount} skipped, ${errorCount} errors`;
    } else {
        message = `${successCount} professors enrolled successfully${createdCount > 0 ? ` (${createdCount} new users created)` : ''}`;
    }

    return {
        message,
        results
    };
}

export { router };
