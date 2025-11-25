import express from 'express';

const router = express.Router();

/**
 * GET /jobs/:jobId
 * Get status of a background job
 */
router.get('/:jobId', (req, res) => {
    const { jobId } = req.params;
    const jobQueue = req.app.locals.jobQueue;
    const job = jobQueue.getJob(jobId);
    
    if (!job) {
        return res.status(404).json({ 
            success: false, 
            error: 'Job not found' 
        });
    }
    
    res.json({ 
        success: true, 
        ...job 
    });
});

export default router;
