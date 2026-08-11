import express from 'express';
import { SUAP } from '../models/SUAP.js';
import { Match } from '../models/Match.js';
import { suapConfig } from '../config/suap-config.js';
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
            
            // Ensure the structure is correct (handle legacy format)
            const normalizedData = {
                subjects: data.subjects || {},
                students: data.students || {},
                manualEnrollments: data.manualEnrollments || {}
            };
            
            res.json({
                success: true,
                data: normalizedData,
                studentUrl: `${suapConfig.baseUrl}/${suapConfig.studentProfile.url}/{{enrollment}}`,
            });
        } catch (error) {
            // File doesn't exist or is invalid - return empty data
            if (error.code === 'ENOENT') {
                res.json({
                    success: true,
                    data: {
                        subjects: {},
                        students: {},
                        manualEnrollments: {}
                    },
                    studentUrl: `${suapConfig.baseUrl}/${suapConfig.studentProfile.url}/{{enrollment}}`,
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
 * POST /suap/manual-student
 * Fetch a student profile by enrollment and store manual Moodle course enrollments
 */
router.post('/manual-student', async (req, res) => {
    try {
        const enrollment = String(req.body.matricula || req.body.enrollment || '').trim();
        const password = String(req.body.password || '').trim();
        const courseIds = Array.from(new Set(
            (Array.isArray(req.body.courseIds)
                ? req.body.courseIds
                : String(req.body.courseIds || req.body.courses || '')
                    .split(','))
                .map(courseId => String(courseId || '').trim())
                .filter(Boolean)
        ));

        if (!enrollment) {
            return res.status(400).json({
                success: false,
                error: 'SUAP enrollment is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        if (courseIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one Moodle course ID is required'
            });
        }

        const suap = new SUAP();
        const manualStudent = await suap.addManualStudent({
            enrollment,
            password,
            courseIds,
        });

        res.status(201).json({
            success: true,
            message: `Manual student saved for ${manualStudent.name}`,
            data: manualStudent,
        });
    } catch (error) {
        console.error('Manual student save error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

router.post('/manual-student/remove', async (req, res) => {
    try {
        const enrollment = String(req.body.matricula || req.body.enrollment || '').trim();

        if (!enrollment) {
            return res.status(400).json({
                success: false,
                error: 'SUAP enrollment is required'
            });
        }

        const suap = new SUAP();
        await suap.removeManualStudent(enrollment);

        res.json({
            success: true,
            message: `Manual student removed for ${enrollment}`,
        });
    } catch (error) {
        console.error('Manual student removal error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /suap/manual-students/clear
 * Clear the locally queued manual student rows.
 */
router.post('/manual-students/clear', async (req, res) => {
    try {
        const suap = new SUAP();
        const result = suap.clearManualStudents();

        res.json({
            success: true,
            message: 'Manual student queue cleared',
            ...result,
        });
    } catch (error) {
        console.error('Manual student queue clear error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /suap/manual-students/from-subject
 * Scrape a SUAP diário by ID and queue all of its students for Moodle enrollment.
 */
router.post('/manual-students/from-subject', async (req, res) => {
    try {
        const subjectId = String(req.body.subjectId || req.body.suapId || '').trim();
        const password = String(req.body.password || '').trim();
        const courseIds = Array.from(new Set(
            (Array.isArray(req.body.courseIds)
                ? req.body.courseIds
                : String(req.body.courseIds || req.body.courses || '').split(','))
                .map(courseId => String(courseId || '').trim())
                .filter(Boolean)
        ));

        if (!subjectId) {
            return res.status(400).json({
                success: false,
                error: 'SUAP subject ID is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        if (courseIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one Moodle course ID is required'
            });
        }

        const params = { subjectId, password, courseIds };
        const jobQueue = req.app.locals.jobQueue;
        const jobId = jobQueue.queue(async (queuedJobId, updateProgress) => {
            return await processManualStudentsFromSubject(queuedJobId, params, updateProgress);
        });

        res.status(202).json({
            success: true,
            jobId,
            message: 'Manual students from SUAP diário job started',
            statusUrl: `/api/jobs/${jobId}`
        });
    } catch (error) {
        console.error('Manual students from SUAP diário error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
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
 * POST /suap/extract-matched
 * Extract SUAP subjects specifically for all matched subject IDs (long-running operation, returns job ID)
 */
router.post('/extract-matched', async (req, res) => {
    try {
        const matchModel = new Match();
        const matches = matchModel.getAllMatches();

        // Collect all unique suapIds from matches
        const suapIdsSet = new Set();
        matches.forEach(m => {
            if (m.suapId) {
                const ids = Array.isArray(m.suapId) ? m.suapId : [m.suapId];
                ids.forEach(id => {
                    if (id) suapIdsSet.add(String(id).trim());
                });
            }
        });

        const suapIds = Array.from(suapIdsSet).filter(Boolean);

        if (suapIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No matched SUAP subjects found. Please match subjects first in Step 3.'
            });
        }

        console.log(`Starting SUAP extraction for ${suapIds.length} matched subjects...`);
        const jobQueue = req.app.locals.jobQueue;

        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processExtractMatchedSUAP(jobId, suapIds, updateProgress);
        });

        res.status(202).json({
            success: true,
            jobId,
            message: `SUAP extraction job started for ${suapIds.length} matched subjects`,
            statusUrl: `/api/jobs/${jobId}`
        });
    } catch (error) {
        console.error('SUAP matched extraction error:', error);
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
 * Extract students and/or professors from multiple SUAP subjects (long-running operation, returns job ID)
 * @body {string[]} subjectIds - Array of subject IDs to extract
 * @body {string} extractType - Type of extraction: 'students', 'professors', or 'both' (default: 'both')
 */
router.post('/extract-students', async (req, res) => {
    try {
        const { subjectIds, extractType = 'both' } = req.body;

        if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array of subject IDs is required'
            });
        }

        const validTypes = ['students', 'professors', 'both'];
        if (!validTypes.includes(extractType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid extractType. Must be one of: ${validTypes.join(', ')}`
            });
        }

        console.log(`Starting ${extractType} extraction job for ${subjectIds.length} subjects...`);

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processExtractStudents(jobId, subjectIds, extractType, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({
            success: true,
            jobId,
            message: `${extractType === 'both' ? 'Student/professor' : extractType.charAt(0).toUpperCase() + extractType.slice(1)} extraction job started`,
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /suap/professors
 * Get all scraped professors data from file
 */
router.get('/professors', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'files', 'suap_professors.json');
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            
            // Ensure the structure is correct
            const normalizedData = {
                subjects: data.subjects || {},
                professors: data.professors || {}
            };
            
            res.json({
                success: true,
                data: normalizedData,
                professorUrl: `${suapConfig.baseUrl}/${suapConfig.professorProfile.url}/{{siape}}`,
            });
        } catch (error) {
            // File doesn't exist or is invalid - return empty data
            if (error.code === 'ENOENT') {
                res.json({
                    success: true,
                    data: {
                        subjects: {},
                        professors: {}
                    }
                });
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('Error reading professors data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /suap/extract-professors
 * Extract professors from multiple SUAP subjects (long-running operation, returns job ID)
 */
router.post('/extract-professors', async (req, res) => {
    try {
        const { subjectIds } = req.body;

        if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array of subject IDs is required'
            });
        }

        console.log(`Starting professor extraction job for ${subjectIds.length} subjects...`);

        const jobQueue = req.app.locals.jobQueue;

        // Start async job
        const jobId = jobQueue.queue(async (jobId, updateProgress) => {
            return await processExtractProfessors(jobId, subjectIds, updateProgress);
        });

        // Return job ID immediately
        res.status(202).json({
            success: true,
            jobId,
            message: 'Professor extraction job started',
            statusUrl: `/api/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Professor extraction error:', error);
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

// Async function to process matched SUAP extraction
async function processExtractMatchedSUAP(jobId, subjectIds, updateProgress) {
    updateProgress({
        message: `Starting extraction for ${subjectIds.length} matched SUAP subjects...`
    });

    console.log(`[${jobId}] Starting matched SUAP extraction for IDs:`, subjectIds);

    const suap = new SUAP();
    await suap.extractSubjectsByIds(subjectIds, (message) => {
        updateProgress({ message });
    });

    console.log(`[${jobId}] Matched SUAP extraction completed`);

    return {
        message: `Extracted ${subjectIds.length} matched SUAP subjects successfully`,
        file: 'files/suap_subjects.json'
    };
}

// Async function to process student/professor extraction
// extractType: 'students', 'professors', or 'both'
async function processExtractStudents(jobId, subjectIds, extractType, updateProgress) {
    const typeLabel = extractType === 'both' ? 'student/professor' : extractType;
    console.log(`[${jobId}] Starting ${typeLabel} extraction for ${subjectIds.length} subjects`);

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

            let students = [];
            let professors = [];

            if (extractType === 'both') {
                // Extract both students and professors
                const result = await suap.scrapeStudents(subjectId, (progress) => {
                    updateProgress({
                        message: progress,
                        subject: {
                            id: subjectId,
                            current: completed,
                            total: subjectIds.length,
                        },
                    });
                });
                students = result.students;
                professors = result.professors;
            } else if (extractType === 'students') {
                // Extract only students (faster, doesn't fetch professor emails)
                students = await suap.scrapeStudentsOnly(subjectId, (progress) => {
                    updateProgress({
                        message: progress,
                        subject: {
                            id: subjectId,
                            current: completed,
                            total: subjectIds.length,
                        },
                    });
                });
            } else if (extractType === 'professors') {
                // Extract only professors (faster, doesn't navigate to students tab)
                professors = await suap.scrapeProfessors(subjectId, (progress) => {
                    updateProgress({
                        message: progress,
                        subject: {
                            id: subjectId,
                            current: completed,
                            total: subjectIds.length,
                        },
                    });
                });
            }
            
            results[subjectId] = { students, professors };
            completed++;

            const counts = [];
            if (extractType !== 'professors') counts.push(`${students.length} students`);
            if (extractType !== 'students') counts.push(`${professors.length} professors`);

            console.log(`[${jobId}] Completed ${completed}/${subjectIds.length} - Subject ${subjectId}: ${counts.join(', ')}`);

            updateProgress({
                message: `Subject ${subjectId} Completed`,
                subject: {
                    id: subjectId,
                    current: completed,
                    total: subjectIds.length,
                    studentCount: students.length,
                    professorCount: professors.length,
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

    console.log(`[${jobId}] ${typeLabel} extraction completed`);

    const files = [];
    if (extractType !== 'professors') files.push('files/suap_students.json');
    if (extractType !== 'students') files.push('files/suap_professors.json');

    return {
        message: `Extraction completed: ${completed}/${subjectIds.length} subjects processed`,
        results,
        files
    };
}

// Async function to process professor extraction
async function processExtractProfessors(jobId, subjectIds, updateProgress) {
    console.log(`[${jobId}] Starting professor extraction for ${subjectIds.length} subjects`);

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

            // Pass progress callback to scrapeProfessors
            const professors = await suap.scrapeProfessors(subjectId, (professorProgress) => {
                updateProgress({
                    message: professorProgress,
                    subject: {
                        id: subjectId,
                        current: completed,
                        total: subjectIds.length,
                    },
                });
            });
            
            results[subjectId] = professors;
            completed++;

            console.log(`[${jobId}] Completed ${completed}/${subjectIds.length} - Subject ${subjectId}: ${professors.length} professors`);

            updateProgress({
                message: `Subject ${subjectId} Completed`,
                subject: {
                    id: subjectId,
                    current: completed,
                    total: subjectIds.length,
                    professorCount: professors.length,
                },
            });

        } catch (error) {
            console.error(`[${jobId}] Error scraping professors for subject ${subjectId}:`, error);
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

    console.log(`[${jobId}] Professor extraction completed`);

    return {
        message: `Professor extraction completed: ${completed}/${subjectIds.length} subjects processed`,
        results,
        file: 'files/suap_professors.json'
    };
}

/**
 * Process a queued manual student enrollment job for one SUAP diário.
 * @param {string} jobId - Queue job ID used in progress logs.
 * @param {Object} params - Subject ID, Moodle password, and course IDs.
 * @param {Function} updateProgress - Queue progress callback.
 * @returns {Promise<Object>} Job result with enrollment counts and artifact path.
 */
async function processManualStudentsFromSubject(jobId, params, updateProgress) {
    updateProgress({
        message: `Finding students for SUAP diário ${params.subjectId}`,
    });

    console.log(`[${jobId}] Starting manual student queue from SUAP diário ${params.subjectId}`);

    const suap = new SUAP();
    const result = await suap.addManualStudentsFromSubject(params, (message) => {
        updateProgress({ message });
    });

    return {
        ...result,
        message: `Queued ${result.queuedStudents} students from SUAP diário ${result.subjectId}`,
        file: 'files/suap_students.json',
    };
}

export { router };
