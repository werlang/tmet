import express from 'express';
import Moodle from '../models/Moodle.js';

const router = express.Router();

/**
 * POST /moodle/csv
 * Generate CSV from timetables
 */
router.post('/csv', async (req, res) => {
    try {
        console.log('Starting Moodle CSV generation...');
        
        const moodle = new Moodle();
        await moodle.generateCSV({
            year: req.body.year || new Date().getFullYear(),
            semester: req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
            dateFrom: req.body.dateFrom,
            dateTo: req.body.dateTo
        });
        
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
        
        const moodle = new Moodle();
        const results = await moodle.uploadCourses();
        
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
