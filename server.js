import express from 'express';
import path from 'path';
import fs from 'fs';
import match from './modules/matching.js';
import generateCSV from './modules/generate-csv.js';
import extractSUAP from './modules/extract-suap.js';
import uploadCourses from './modules/upload-courses.js';
import DeepSeek from './helpers/deepseek.js';

const app = express();
const port = 3000;

// In-memory job tracking for AI matching
const aiMatchingJobs = new Map();

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
    const { moodleFullname, suapIds } = req.body;
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
        return res.status(400).json({ success: false, error: 'suapIds array or suapId required' });
    }

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

app.post('/api/ai-match', async (req, res) => {
    try {
        const { moodleSubjects, suapSubjects } = req.body;
        
        if (!moodleSubjects || !suapSubjects) {
            return res.status(400).json({ 
                success: false, 
                error: 'moodleSubjects and suapSubjects are required' 
            });
        }

        // Generate job ID
        const jobId = `ai-match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Initialize job status
        aiMatchingJobs.set(jobId, {
            status: 'in queue',
            startedAt: new Date().toISOString(),
        });

        console.log(`[${jobId}] Starting AI matching for ${moodleSubjects.length} Moodle subjects and ${suapSubjects.length} SUAP subjects...`);

        // Start async processing
        processAIMatching(jobId, moodleSubjects, suapSubjects);

        // Return job ID immediately
        res.json({ 
            success: true,
            jobId,
            message: 'AI matching job started'
        });

    } catch (error) {
        console.error('AI matching error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get AI matching job status
app.get('/api/ai-match/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = aiMatchingJobs.get(jobId);
    
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

// Async function to process AI matching
async function processAIMatching(jobId, moodleSubjects, suapSubjects) {
    try {
        const deepseek = new DeepSeek();
        
        // Update progress
        aiMatchingJobs.set(jobId, {
            ...aiMatchingJobs.get(jobId),
            message: 'Preparing AI prompt...'
        });
        
        // Build the prompt for AI matching
        const systemPrompt = `You are an expert at matching academic course subjects between two different systems. 
Your task is to find the best matches between Moodle subjects and SUAP subjects based on course names, codes, and context.

Rules:
1. Match based on similar subject names, considering abbreviations and synonyms
2. Consider class codes (like ECA, INF, TSI) when matching
3. A single Moodle subject can match multiple SUAP subjects (1-to-N matching)
4.  
5. Only suggest matches you are confident about (>80% confidence)
6. Provide a brief reason for each match

Respond ONLY with a valid JSONL, where each line is a JSON object in this format:
{
  "moodleFullname": "exact moodle fullname from input",
  "suapIds": ["suap_id_1", "suap_id_2"],
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation"
}

If you cannot find any confident matches, respond with null.`;

        const userMessage = `Find matches between these Moodle and SUAP subjects:

MOODLE SUBJECTS:
${moodleSubjects.map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`).join('\n')}

SUAP SUBJECTS:
${suapSubjects.map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`).join('\n')}`;

        // Update progress
        aiMatchingJobs.set(jobId, {
            ...aiMatchingJobs.get(jobId),
            message: 'Analyzing subjects with AI...'
        });

        const response = await deepseek.chat(userMessage, systemPrompt, {
            temperature: 0.3,
            maxTokens: 4096,
        });
        console.log(response);

        // Update progress
        aiMatchingJobs.set(jobId, {
            ...aiMatchingJobs.get(jobId),
            message: 'Parsing AI response...'
        });

        // Parse the AI response
        let matches = [];
        try {
            const jsonMatch = response.match(/\{[\s\S]*?\}/g);
            if (jsonMatch) {
                matches = jsonMatch.map(line => JSON.parse(line));
            } else {
                console.warn(`[${jobId}] AI response did not contain valid JSON array`);
            }
        } catch (parseError) {
            console.error(`[${jobId}] Failed to parse AI response:`, parseError);
            throw new Error('AI returned invalid response format');
        }

        const filteredMatches = matches.filter(m => m.confidence > 0.8);
        console.log(`[${jobId}] AI suggested ${filteredMatches.length} high-confidence matches`);

        // Job completed successfully
        aiMatchingJobs.set(jobId, {
            status: 'completed',
            message: 'AI matching completed',
            matches: filteredMatches,
            completedAt: new Date().toISOString(),
        });

        // Auto-cleanup after 5 minutes
        setTimeout(() => aiMatchingJobs.delete(jobId), 5 * 60 * 1000);

    } catch (error) {
        console.error(`[${jobId}] AI matching error:`, error);
        aiMatchingJobs.set(jobId, {
            status: 'failed',
            message: error.message,
            error: error.message,
            failedAt: new Date().toISOString(),
        });
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
