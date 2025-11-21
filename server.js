import express from 'express';
import path from 'path';
import fs from 'fs';
import match from './modules/matching.js';
import generateCSV from './modules/generate-csv.js';
import extractSUAP from './modules/extract-suap.js';
import uploadCourses from './modules/upload-courses.js';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/api/data', (req, res) => {
    try {
        const data = match();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/match', (req, res) => {
    const { moodleFullname, suapId } = req.body;
    const manualMatchesPath = path.resolve('files', 'manual_matches.json');
    
    let manualMatches = [];
    if (fs.existsSync(manualMatchesPath)) {
        manualMatches = JSON.parse(fs.readFileSync(manualMatchesPath, 'utf-8'));
    }

    // Remove existing match for this moodle subject if any
    manualMatches = manualMatches.filter(m => m.moodleFullname !== moodleFullname);
    
    // Add new match
    manualMatches.push({ moodleFullname, suapId });

    fs.writeFileSync(manualMatchesPath, JSON.stringify(manualMatches, null, 2));
    
    res.json({ success: true });
});

app.post('/api/generate-csv', async (req, res) => {
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

app.post('/api/extract-suap', async (req, res) => {
    try {
        console.log('Starting SUAP extraction...');
        await extractSUAP(
            req.body.year || new Date().getFullYear(),
            req.body.semester || (new Date().getMonth() < 6 ? 1 : 2),
            req.body.courses || undefined
        );
        res.json({ 
            success: true, 
            message: 'SUAP data extracted successfully',
            file: 'files/suap_subjects.json'
        });
    } catch (error) {
        console.error('Error extracting SUAP:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/upload-courses', async (req, res) => {
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
