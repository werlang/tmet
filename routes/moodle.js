import express from 'express';
import generateCSV from '../modules/generate-csv.js';
import uploadCourses from '../modules/upload-courses.js';

const router = express.Router();

/**
 * POST /moodle/csv
 * Generate CSV from timetables
 */
router.post('/csv', async (req, res) => {
    try {
        console.log('Starting Moodle CSV generation...');
        const csv = await generateCSV(
            req.body.year || new Date().getFullYear(),
            req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
            req.body.dateFrom || undefined,
            req.body.dateTo || undefined
        );
        res.json({ 
            success: true, 
            message: 'Moodle CSV generated successfully',
            file: 'files/moodle_classes.csv'
        });
    } catch (error) {
        console.error('Error generating CSV:', error);
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
        console.log('Starting Moodle course upload...');
        const results = await uploadCourses();
        res.json({ 
            success: true, 
            message: 'Courses uploaded successfully',
            results
        });
    } catch (error) {
        console.error('Error uploading courses:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;
