/**
 * Moodle Model Tests
 * Tests for the Moodle model with proper mocking of dependencies
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleEdupageClasses, sampleMoodleCsvContent, sampleMatches, sampleSuapSubjects } from '../fixtures.js';

// Mock fs module
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

// Mock TimeTables helper
const mockTimeTables = jest.fn().mockImplementation(() => ({
    getClasses: jest.fn().mockResolvedValue(sampleEdupageClasses)
}));

// Mock MoodleUploader helper
const mockMoodleUploader = jest.fn().mockImplementation(() => ({
    uploadCourses: jest.fn().mockResolvedValue({
        success: [{ id: 1 }],
        errors: []
    })
}));

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

jest.unstable_mockModule('../../helpers/timetables.js', () => ({
    default: mockTimeTables
}));

jest.unstable_mockModule('../../helpers/moodle-uploader.js', () => ({
    default: mockMoodleUploader
}));

// Import Moodle after mocking
const { default: Moodle } = await import('../../models/Moodle.js');

describe('Moodle Model', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a new Moodle instance', () => {
            const moodle = new Moodle();
            expect(moodle).toBeInstanceOf(Moodle);
        });
    });

    describe('generateCourseCSV()', () => {
        it('should generate CSV from timetables', async () => {
            const moodle = new Moodle();
            const params = { year: 2025, semester: 1 };
            
            const result = await moodle.generateCourseCSV(params);

            expect(mockTimeTables).toHaveBeenCalledWith(expect.objectContaining({
                year: 2025
            }));
            expect(typeof result).toBe('string');
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should call progress callback during generation', async () => {
            const progressCallback = jest.fn();
            const moodle = new Moodle();
            const params = { year: 2025, semester: 1 };
            
            await moodle.generateCourseCSV(params, progressCallback);

            expect(progressCallback).toHaveBeenCalled();
            expect(progressCallback).toHaveBeenCalledWith('Fetching classes from EduPage API');
        });

        it('should handle classes with groups', async () => {
            const classesWithGroups = [{
                id: "1",
                name: "INF-1AT",
                subjects: [
                    {
                        subject: { name: "TEC - Banco de Dados", short: "TEC - BD" },
                        groupnames: ["Grupo 1"],
                        classids: ["1"]
                    }
                ]
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(classesWithGroups)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toContain('-G1');
            expect(result).toContain('_G1');
        });

        it('should handle classes with Grupo 2', async () => {
            const classesWithGroup2 = [{
                id: "1",
                name: "INF-1AT",
                subjects: [
                    {
                        subject: { name: "TEC - Banco de Dados", short: "TEC - BD" },
                        groupnames: ["Grupo 2"],
                        classids: ["1"]
                    }
                ]
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(classesWithGroup2)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toContain('-G2');
            expect(result).toContain('_G2');
        });

        it('should handle multi-class subjects', async () => {
            const multiClassSubjects = [
                {
                    id: "1",
                    name: "ECA-8AN",
                    subjects: [
                        {
                            subject: { name: "TEC - Gestão e Empreendedorismo", short: "TEC - GE" },
                            groupnames: [],
                            classids: ["1", "2"]
                        }
                    ]
                },
                {
                    id: "2",
                    name: "TSI-4AN",
                    subjects: []
                }
            ];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(multiClassSubjects)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            // Should contain comma-separated class names
            expect(result).toContain('ECA-8AN,TSI-4AN');
        });

        it('should deduplicate subjects by fullname', async () => {
            const duplicateSubjects = [
                {
                    id: "1",
                    name: "INF-1AT",
                    subjects: [
                        {
                            subject: { name: "TEC - Banco de Dados", short: "TEC - BD" },
                            groupnames: [],
                            classids: ["1"]
                        }
                    ]
                },
                {
                    id: "2",
                    name: "INF-1AT",
                    subjects: [
                        {
                            subject: { name: "TEC - Banco de Dados", short: "TEC - BD" },
                            groupnames: [],
                            classids: ["2"]
                        }
                    ]
                }
            ];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(duplicateSubjects)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            // Count occurrences of the subject
            const matches = result.match(/Banco de Dados/g) || [];
            expect(matches.length).toBe(1);
        });

        it('should skip subjects without valid category', async () => {
            const unknownCategory = [{
                id: "1",
                name: "UNKNOWN-1AT",
                subjects: [
                    {
                        subject: { name: "TEC - Some Subject", short: "TEC - SS" },
                        groupnames: [],
                        classids: ["1"]
                    }
                ]
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(unknownCategory)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            // Should only have header
            expect(result).toBe('fullname, shortname, category');
        });

        it('should handle classes with no subjects', async () => {
            const noSubjects = [{
                id: "1",
                name: "INF-1AT",
                subjects: null
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(noSubjects)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toBe('fullname, shortname, category');
        });

        it('should handle empty classes array', async () => {
            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue([])
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toBe('fullname, shortname, category');
        });
    });

    describe('uploadCourses()', () => {
        it('should throw error if CSV file does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const moodle = new Moodle();

            await expect(moodle.uploadCourses()).rejects.toThrow('CSV file not found');
        });

        it('should upload courses from CSV file', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(sampleMoodleCsvContent);

            const moodle = new Moodle();
            const result = await moodle.uploadCourses();

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('errors');
        });

        it('should call progress callback during upload', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(sampleMoodleCsvContent);

            const progressCallback = jest.fn();
            const moodle = new Moodle();
            await moodle.uploadCourses(progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Initializing Moodle uploader');
        });

        it('should handle upload errors', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(sampleMoodleCsvContent);

            mockMoodleUploader.mockImplementation(() => ({
                uploadCourses: jest.fn().mockResolvedValue({
                    success: [],
                    errors: [{ course: 'Test', error: 'Failed' }]
                })
            }));

            const moodle = new Moodle();
            const result = await moodle.uploadCourses();

            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('generateStudentCSV()', () => {
        it('should throw error if students data file does not exist', async () => {
            mockFs.existsSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) return false;
                return true;
            });

            const moodle = new Moodle();

            await expect(moodle.generateStudentCSV()).rejects.toThrow('Students data not found');
        });

        it('should throw error if moodle CSV file does not exist', async () => {
            mockFs.existsSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) return false;
                if (path.includes('suap_students.json')) return true;
                return true;
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                subjects: {},
                students: {}
            }));

            const moodle = new Moodle();

            await expect(moodle.generateStudentCSV()).rejects.toThrow('Moodle courses CSV not found');
        });

        it('should generate student CSV from matched subjects', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001", "2021002"]
                },
                students: {
                    "2021001": { name: "João Silva", email: "joao.silva@email.com" },
                    "2021002": { name: "Maria Santos", email: "maria.santos@email.com" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            expect(result).toHaveProperty('totalStudents');
            expect(result).toHaveProperty('processedSubjects');
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should call progress callback during generation', async () => {
            const studentsData = { subjects: {}, students: {} };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const progressCallback = jest.fn();
            const moodle = new Moodle();
            await moodle.generateStudentCSV(progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Loading students data');
        });

        it('should handle array of suapIds in matches', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001"],
                    "60240": ["2021002"]
                },
                students: {
                    "2021001": { name: "João Silva", email: "joao.silva@email.com" },
                    "2021002": { name: "Maria Santos", email: "maria.santos@email.com" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: ["60244", "60240"],
                        type: "manual"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            expect(result.totalStudents).toBe(2);
        });

        it('should deduplicate students when same enrollment in multiple subjects', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001"],
                    "60240": ["2021001"]  // Same student
                },
                students: {
                    "2021001": { name: "João Silva", email: "joao.silva@email.com" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: ["60244", "60240"],
                        type: "manual"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            // Should only count unique students
            expect(result.totalStudents).toBe(1);
        });

        it('should handle matches.json not existing', async () => {
            const studentsData = { subjects: {}, students: {} };

            mockFs.existsSync.mockImplementation((path) => {
                if (path.includes('matches.json')) return false;
                return true;
            });
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            expect(result.totalStudents).toBe(0);
            expect(result.processedSubjects).toBe(0);
        });

        it('should skip students not found in students map', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001", "2021999"]  // 2021999 doesn't exist
                },
                students: {
                    "2021001": { name: "João Silva", email: "joao.silva@email.com" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            expect(result.totalStudents).toBe(1);
        });

        it('should handle student with empty name parts', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001"]
                },
                students: {
                    "2021001": { name: "João", email: "joao@email.com" }  // Single name
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateStudentCSV();

            expect(result.totalStudents).toBe(1);
            
            // Check the written CSV content
            const writtenCsv = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenCsv).toContain('joao');
        });
    });

    describe('edge cases', () => {
        it('should handle subject name with multiple hyphens', async () => {
            const classesWithComplexSubject = [{
                id: "1",
                name: "INF-1AT",
                subjects: [
                    {
                        subject: { name: "TEC - Back-end Development - Level I", short: "TEC - BE1" },
                        groupnames: [],
                        classids: ["1"]
                    }
                ]
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(classesWithComplexSubject)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toContain('Back-end Development - Level I');
        });

        it('should handle unicode characters in subject names', async () => {
            const classesWithUnicode = [{
                id: "1",
                name: "INF-1AT",
                subjects: [
                    {
                        subject: { name: "MAT - Cálculo Matemático", short: "MAT - CM" },
                        groupnames: [],
                        classids: ["1"]
                    }
                ]
            }];

            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue(classesWithUnicode)
            }));

            const moodle = new Moodle();
            const result = await moodle.generateCourseCSV({ year: 2025, semester: 1 });

            expect(result).toContain('Cálculo Matemático');
        });

        it('should handle dateFrom and dateTo params', async () => {
            mockTimeTables.mockImplementation(() => ({
                getClasses: jest.fn().mockResolvedValue([])
            }));

            const moodle = new Moodle();
            await moodle.generateCourseCSV({ 
                year: 2025, 
                semester: 1,
                dateFrom: '2025-01-01',
                dateTo: '2025-06-30'
            });

            expect(mockTimeTables).toHaveBeenCalledWith(expect.objectContaining({
                year: 2025,
                dateFrom: '2025-01-01',
                dateTo: '2025-06-30'
            }));
        });

        it('should report progress for each subject in generateStudentCSV', async () => {
            const studentsData = {
                subjects: {
                    "60244": ["2021001"],
                    "60240": ["2021002"]
                },
                students: {
                    "2021001": { name: "João Silva", email: "joao.silva@email.com" },
                    "2021002": { name: "Maria Santos", email: "maria.santos@email.com" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_students.json')) {
                    return JSON.stringify(studentsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([
                        {
                            moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                            suapId: "60244",
                            type: "auto"
                        },
                        {
                            moodleFullname: "[2025.1] INF-2AM - Programação Web I",
                            suapId: "60240",
                            type: "auto"
                        }
                    ]);
                }
                return '';
            });

            const progressCallback = jest.fn();
            const moodle = new Moodle();
            await moodle.generateStudentCSV(progressCallback);

            // Should call progress for each processed subject
            expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Processed'));
        });
    });

    describe('generateProfessorCSV()', () => {
        it('should throw error if professors data file does not exist', async () => {
            mockFs.existsSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) return false;
                return true;
            });

            const moodle = new Moodle();

            await expect(moodle.generateProfessorCSV()).rejects.toThrow('Professors data not found');
        });

        it('should throw error if moodle CSV file does not exist', async () => {
            mockFs.existsSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) return false;
                if (path.includes('suap_professors.json')) return true;
                return true;
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                subjects: {},
                professors: {}
            }));

            const moodle = new Moodle();

            await expect(moodle.generateProfessorCSV()).rejects.toThrow('Moodle courses CSV not found');
        });

        it('should generate professor CSV from matched subjects', async () => {
            const professorsData = {
                subjects: {
                    "60244": ["1234567", "2345678"]
                },
                professors: {
                    "1234567": { name: "João Silva", email: "joao.silva@ifsul.edu.br" },
                    "2345678": { name: "Maria Santos", email: "maria.santos@ifsul.edu.br" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateProfessorCSV();

            expect(result).toHaveProperty('totalProfessors');
            expect(result).toHaveProperty('processedSubjects');
            expect(result.totalProfessors).toBe(2);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should call progress callback during generation', async () => {
            const professorsData = { subjects: {}, professors: {} };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const progressCallback = jest.fn();
            const moodle = new Moodle();
            await moodle.generateProfessorCSV(progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Loading professors data');
        });

        it('should handle array of suapIds in matches', async () => {
            const professorsData = {
                subjects: {
                    "60244": ["1234567"],
                    "60240": ["2345678"]
                },
                professors: {
                    "1234567": { name: "João Silva", email: "joao.silva@ifsul.edu.br" },
                    "2345678": { name: "Maria Santos", email: "maria.santos@ifsul.edu.br" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: ["60244", "60240"],
                        type: "manual"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateProfessorCSV();

            expect(result.totalProfessors).toBe(2);
        });

        it('should deduplicate professors when same SIAPE in multiple subjects', async () => {
            const professorsData = {
                subjects: {
                    "60244": ["1234567"],
                    "60240": ["1234567"]  // Same professor
                },
                professors: {
                    "1234567": { name: "João Silva", email: "joao.silva@ifsul.edu.br" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: ["60244", "60240"],
                        type: "manual"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            const result = await moodle.generateProfessorCSV();

            // Should only count unique professors
            expect(result.totalProfessors).toBe(1);
        });

        it('should use editingteacher as role in CSV', async () => {
            const professorsData = {
                subjects: {
                    "60244": ["1234567"]
                },
                professors: {
                    "1234567": { name: "João Silva", email: "joao.silva@ifsul.edu.br" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            await moodle.generateProfessorCSV();

            // Check the written CSV content
            const writtenCsv = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenCsv).toContain('editingteacher');
        });

        it('should use 123456 as password in CSV', async () => {
            const professorsData = {
                subjects: {
                    "60244": ["1234567"]
                },
                professors: {
                    "1234567": { name: "João Silva", email: "joao.silva@ifsul.edu.br" }
                }
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('suap_professors.json')) {
                    return JSON.stringify(professorsData);
                }
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "60244",
                        type: "auto"
                    }]);
                }
                return '';
            });

            const moodle = new Moodle();
            await moodle.generateProfessorCSV();

            // Check the written CSV content - password should be 123456
            const writtenCsv = mockFs.writeFileSync.mock.calls[0][1];
            expect(writtenCsv).toContain('123456');
            // Username should be email prefix
            expect(writtenCsv).toContain('joao.silva');
        });
    });
});
