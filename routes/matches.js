import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

/**
 * GET /matches
 * Get all matching data (matched and unmatched subjects)
 */
router.get('/', (req, res) => {
    try {
        const match = new Match();
        const data = match.getAll();
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

    // Support both single suapId (legacy) and array suapIds
    const suapId = Array.isArray(suapIds) ? suapIds : req.body.suapId;
    
    if (!suapId) {
        return res.status(400).json({ 
            success: false, 
            error: 'suapIds array or suapId required' 
        });
    }

    try {
        const match = new Match();
        match.create(moodleFullname, suapId);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
