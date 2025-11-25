import { jest } from '@jest/globals';

/**
 * Test Fixtures
 * Sample data for unit tests
 */

/**
 * Sample SUAP subjects for testing
 */
export const sampleSuapSubjects = [
    {
        id: "60244",
        name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]  [Matriz 90]",
        class: "20251.2.CH.INF_I.90.1T",
        className: "INF-2AT",
        fullname: "INF-2AT - Programação Web I",
        subjectName: "Programação Web I",
        group: "G2"
    },
    {
        id: "60241",
        name: "TEC.3473 - Banco de Dados - Ensino Médio [120.00 h/160.00 Aulas]  [Matriz 90]",
        class: "20251.2.CH.INF_I.90.1T",
        className: "INF-2AT",
        fullname: "INF-2AT - Banco de Dados",
        subjectName: "Banco de Dados",
        group: "G2"
    },
    {
        id: "60240",
        name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]  [Matriz 90]",
        class: "20251.2.CH.INF_I.90.1M",
        className: "INF-2AM",
        fullname: "INF-2AM - Programação Web I",
        subjectName: "Programação Web I",
        group: false
    },
    {
        id: "55039",
        name: "TEC.3835 - Matemática I - Ensino Médio [90.00 h/120.00 Aulas]  [Matriz 90]",
        class: "20251.1.CH.INF_I.90.1T",
        className: "INF-1AT",
        fullname: "INF-1AT - Matemática I",
        subjectName: "Matemática I",
        group: "G1"
    },
    {
        id: "60237",
        name: "TEC.3835 - Matemática I - Ensino Médio [90.00 h/120.00 Aulas]  [Matriz 90]",
        class: "20251.1.CH.INF_I.90.1T",
        className: "INF-1AT",
        fullname: "INF-1AT - Matemática I",
        subjectName: "Matemática I",
        group: "G2"
    }
];

/**
 * Sample Moodle CSV content for testing
 */
export const sampleMoodleCsvContent = `fullname, shortname, category
"[2025.1] INF-2AT-G2 - Programação Web I", CH_INF_2AT_PW1_2025.1_G2, 115
"[2025.1] INF-2AT-G2 - Banco de Dados", CH_INF_2AT_BD_2025.1_G2, 115
"[2025.1] INF-2AM - Programação Web I", CH_INF_2AM_PW1_2025.1, 115
"[2025.1] INF-1AT-G1 - Matemática I", CH_INF_1AT_Mat1_2025.1_G1, 115
"[2025.1] INF-1AT-G2 - Matemática I", CH_INF_1AT_Mat1_2025.1_G2, 115
"[2025.1] ECA-1AN - Cálculo I", CH_ECA_1AN_Calc1_2025.1, 119`;

/**
 * Sample manual matches for testing
 */
export const sampleManualMatches = [
    {
        moodleFullname: "[2025.1] INF-1AT-G1 - Matemática I",
        suapId: "55039"
    },
    {
        moodleFullname: "[2025.1] INF-1AT-G2 - Matemática I",
        suapId: ["60237"]
    }
];

/**
 * Sample Moodle subjects (parsed from CSV)
 */
export const sampleMoodleSubjects = [
    {
        fullname: "[2025.1] INF-2AT-G2 - Programação Web I",
        shortname: "CH_INF_2AT_PW1_2025.1_G2",
        category: "115"
    },
    {
        fullname: "[2025.1] INF-2AT-G2 - Banco de Dados",
        shortname: "CH_INF_2AT_BD_2025.1_G2",
        category: "115"
    },
    {
        fullname: "[2025.1] INF-2AM - Programação Web I",
        shortname: "CH_INF_2AM_PW1_2025.1",
        category: "115"
    },
    {
        fullname: "[2025.1] ECA-1AN - Cálculo I",
        shortname: "CH_ECA_1AN_Calc1_2025.1",
        category: "119"
    }
];

/**
 * Sample EduPage classes response for testing
 */
export const sampleEdupageClasses = [
    {
        id: "1",
        name: "INF-1AT",
        subjects: [
            {
                subject: { name: "TEC - Banco de Dados", short: "TEC - BD" },
                groupnames: [],
                classids: ["1"]
            },
            {
                subject: { name: "TEC - Programação Web I", short: "TEC - PW1" },
                groupnames: ["Grupo 1"],
                classids: ["1"]
            }
        ]
    },
    {
        id: "2",
        name: "ECA-1AN",
        subjects: [
            {
                subject: { name: "MAT - Cálculo I", short: "MAT - Calc1" },
                groupnames: [],
                classids: ["2"]
            }
        ]
    }
];

/**
 * Sample AI match response
 */
export const sampleAIMatchResponse = `{"moodleFullname": "[2025.1] INF-2AT-G2 - Programação Web I", "suapIds": ["60244"], "confidence": 0.95}
{"moodleFullname": "[2025.1] INF-2AT-G2 - Banco de Dados", "suapIds": ["60241"], "confidence": 0.9}`;

/**
 * Sample job data
 */
export const sampleJob = {
    id: "test-job-123",
    status: "completed",
    startedAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:05.000Z",
    message: "Test job completed",
    results: { success: true }
};

/**
 * Create a mock Express app locals object with jobQueue
 */
export function createMockJobQueue() {
    const jobs = new Map();
    let jobIdCounter = 0;

    return {
        queue: jest.fn((callback) => {
            const jobId = `job-${++jobIdCounter}`;
            jobs.set(jobId, {
                id: jobId,
                status: 'queued',
                startedAt: new Date().toISOString(),
                callback
            });
            // Simulate async job start
            setTimeout(async () => {
                const job = jobs.get(jobId);
                if (job) {
                    job.status = 'running';
                    try {
                        const result = await callback(jobId, (data) => {
                            Object.assign(job, data);
                        });
                        job.status = 'completed';
                        job.results = result;
                    } catch (error) {
                        job.status = 'failed';
                        job.error = error.message;
                    }
                }
            }, 0);
            return jobId;
        }),
        getJob: jest.fn((jobId) => jobs.get(jobId) || null),
        createJob: jest.fn((callback) => {
            const jobId = `job-${++jobIdCounter}`;
            jobs.set(jobId, {
                id: jobId,
                status: 'queued',
                callback
            });
            return jobId;
        }),
        updateJob: jest.fn((jobId, data) => {
            const job = jobs.get(jobId);
            if (job) {
                Object.assign(job, data);
            }
        }),
        completeJob: jest.fn((jobId, results) => {
            const job = jobs.get(jobId);
            if (job) {
                job.status = 'completed';
                Object.assign(job, results);
            }
        }),
        failJob: jest.fn((jobId, error) => {
            const job = jobs.get(jobId);
            if (job) {
                job.status = 'failed';
                job.error = error.message;
            }
        }),
        getAllJobs: jest.fn(() => Array.from(jobs.values())),
        clearAll: jest.fn(() => jobs.clear()),
        _jobs: jobs // Expose for testing
    };
}
