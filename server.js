import express from 'express';
import path from 'path';
import fs from 'fs';
import match from './modules/matching.js';

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
