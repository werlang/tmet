import express from 'express';
import SUAP from '../models/SUAP.js';
import suapConfig from '../config/suap-config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /suap/students
 * Get all scraped students data from file
 */
router.get('/students', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'files', 'suap_students.json');
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            
            res.json({
                success: true,
                data,
                studentUrl: `${suapConfig.baseUrl}/${suapConfig.studentProfile.url}/{{enrollment}}`,
            });
        } catch (error) {
            // File doesn't exist or is invalid - return empty data
            if (error.code === 'ENOENT') {
                res.json({
                    success: true,
                    data: {}
                });
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('Error reading students data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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

/**
 * GET /suap/subjects/:id/students
 * Get students enrolled in a specific SUAP subject
 */
router.get('/subjects/:id/students', async (req, res) => {
    try {
        const subjectId = req.params.id;

        if (!subjectId) {
            return res.status(400).json({
                success: false,
                error: 'Subject ID is required'
            });
        }

        console.log(`Fetching students for subject ${subjectId}...`);

        const suap = new SUAP();
        const students = await suap.scrapeStudents(subjectId);

        res.json({
            success: true,
            subjectId,
            count: students.length,
            students
        });

    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /suap/extract-students
 * Extract students from multiple SUAP subjects (long-running operation, returns job ID)
 */
router.post('/extract-students', async (req, res) => {
    try {
        const { subjectIds } = req.body;

        if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array of subject IDs is required'
            });
        }

        console.log(`Starting student extraction job for ${subjectIds.length} subjects...`);

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processExtractStudents(jobId, subjectIds, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({
            success: true,
            jobId,
            message: 'Student extraction job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Student extraction error:', error);
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

// Async function to process student extraction
async function processExtractStudents(jobId, subjectIds, updateProgress) {
    console.log(`[${jobId}] Starting student extraction for ${subjectIds.length} subjects`);

    const suap = new SUAP();
    const results = {};
    let completed = 0;

    for (let i = 0; i < subjectIds.length; i++) {
        const subjectId = subjectIds[i];
        
        try {
            updateProgress({
                message: `Starting subject ${subjectId}...`,
                subject: {
                    id: subjectId,
                    current: completed,
                    total: subjectIds.length,
                },
            });

            // Pass progress callback to scrapeStudents
            const students = await suap.scrapeStudents(subjectId, (studentProgress) => {
                updateProgress({
                    message: studentProgress,
                    subject: {
                        id: subjectId,
                        current: completed,
                        total: subjectIds.length,
                    },
                });
            });
            
            results[subjectId] = students;
            completed++;

            console.log(`[${jobId}] Completed ${completed}/${subjectIds.length} - Subject ${subjectId}: ${students.length} students`);

            updateProgress({
                message: `Subject ${subjectId} Completed`,
                subject: {
                    id: subjectId,
                    current: completed,
                    total: subjectIds.length,
                    studentCount: students.length,
                },
            });

        } catch (error) {
            console.error(`[${jobId}] Error scraping subject ${subjectId}:`, error);
            results[subjectId] = { error: error.message };
            completed++;

            updateProgress({
                message: `Error processing subject ${subjectId}: ${error.message}`,
                subject: {
                    id: subjectId,
                    current: completed,
                    total: subjectIds.length,
                    error: error.message
                },
            });
        }
    }

    console.log(`[${jobId}] Student extraction completed`);

    return {
        message: `Student extraction completed: ${completed}/${subjectIds.length} subjects processed`,
        results,
        file: 'files/suap_students.json'
    };
}

export default router;
