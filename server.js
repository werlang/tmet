import express from 'express';
import Queue from './helpers/queue.js';

// Import routers
import matchesRouter from './routes/matches.js';
import moodleRouter from './routes/moodle.js';
import suapRouter from './routes/suap.js';
import aiRouter from './routes/ai.js';
import jobsRouter from './routes/jobs.js';

const app = express();
const port = 3000;

// Single job queue for all operations
const jobQueue = new Queue();

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
