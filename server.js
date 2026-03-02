import express from 'express';
import { JobQueue } from './helpers/queue.js';

// Import routers
import { router as matchesRouter } from './routes/matches.js';
import { router as moodleRouter } from './routes/moodle.js';
import { router as suapRouter } from './routes/suap.js';
import { router as aiRouter } from './routes/ai.js';
import { router as jobsRouter } from './routes/jobs.js';

const app = express();
const port = 3000;

// Single job queue for all operations
const jobQueue = new JobQueue();

// Make jobQueue available to routes
app.locals.jobQueue = jobQueue;

app.use(express.json());
app.use(express.static('public'));

// Mount API routes
app.use('/api/matches', matchesRouter);
app.use('/api/moodle', moodleRouter);
app.use('/api/suap', suapRouter);
app.use('/api/ai', aiRouter);
app.use('/api/jobs', jobsRouter);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
