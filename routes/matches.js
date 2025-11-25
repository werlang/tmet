import express from 'express';
import path from 'path';
import fs from 'fs';
import match from '../modules/matching.js';

const router = express.Router();

/**
 * GET /matches
 * Get all matching data (matched and unmatched subjects)
 */
router.get('/', (req, res) => {
    try {
        const data = match();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /matches
 * Create a manual match between Moodle and SUAP subjects
 */
router.post('/', (req, res) => {
    const { moodleFullname, suapIds } = req.body;
    
    if (!moodleFullname) {
        return res.status(400).json({ 
            success: false, 
            error: 'moodleFullname is required' 
        });
    }

    const manualMatchesPath = path.resolve('files', 'manual_matches.json');
    
    let manualMatches = [];
    if (fs.existsSync(manualMatchesPath)) {
        manualMatches = JSON.parse(fs.readFileSync(manualMatchesPath, 'utf-8'));
    }

    // Remove existing match for this moodle subject if any
    manualMatches = manualMatches.filter(m => m.moodleFullname !== moodleFullname);
    
    // Add new match - support both single suapId (legacy) and array suapIds
    if (Array.isArray(suapIds)) {
        manualMatches.push({ moodleFullname, suapId: suapIds });
    } else if (req.body.suapId) {
        // Legacy support for single suapId
        manualMatches.push({ moodleFullname, suapId: req.body.suapId });
    } else {
        return res.status(400).json({ 
            success: false, 
            error: 'suapIds array or suapId required' 
        });
    }

    fs.writeFileSync(manualMatchesPath, JSON.stringify(manualMatches, null, 2));
    
    res.status(201).json({ success: true });
});

export default router;
