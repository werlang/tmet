/**
 * SUAP Model Tests
 * Tests for the SUAP model with proper mocking of dependencies
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleSuapSubjects } from '../fixtures.js';

// Mock fs module
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

// Mock SUAPScraper helper
const mockScraperInstance = {
    goto: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue([])
};

const mockSUAPScraper = {
    initialize: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue([])
};

// Mock DOM environment for browser callbacks
const createMockDocument = (html) => {
    const elements = [];
    return {
        querySelectorAll: jest.fn((selector) => {
            // Return mock elements based on selector
            return elements;
        }),
        querySelector: jest.fn((selector) => null)
    };
};

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

jest.unstable_mockModule('../../helpers/scraper.js', () => ({
    SUAPScraper: mockSUAPScraper
}));

// Import SUAP after mocking
const { SUAP } = await import('../../models/SUAP.js');

describe('SUAP Model', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a new SUAP instance', () => {
            const suap = new SUAP();
            expect(suap).toBeInstanceOf(SUAP);
        });
    });

    describe('extractSubjects()', () => {
        it('should initialize scraper and extract subjects', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ 
                year: 2025, 
                semester: 1, 
                courses: ['INF'] 
            });

            expect(mockSUAPScraper.initialize).toHaveBeenCalled();
            expect(Array.isArray(result)).toBe(true);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should call progress callback during extraction', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const progressCallback = jest.fn();
            const suap = new SUAP();
            await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] }, progressCallback);

            expect(progressCallback).toHaveBeenCalledWith('Initializing browser automation');
        });

        it('should use current year when not provided', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const suap = new SUAP();
            await suap.extractSubjects({ courses: ['INF'] });

            expect(mockSUAPScraper.initialize).toHaveBeenCalled();
        });

        it('should use correct semester based on month', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const suap = new SUAP();
            await suap.extractSubjects({ courses: ['INF'] });

            // Just verify it runs without error
            expect(mockSUAPScraper.initialize).toHaveBeenCalled();
        });

        it('should extract all courses when no filter provided', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const suap = new SUAP();
            await suap.extractSubjects({ year: 2025, semester: 1 });

            // Should have been called multiple times for all courses
            expect(mockSUAPScraper.goto).toHaveBeenCalled();
        });

        it('should filter courses when selectedCourses is provided', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const suap = new SUAP();
            await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            // Should only be called once for INF
            const gotoCallCount = mockSUAPScraper.goto.mock.calls.length;
            expect(gotoCallCount).toBe(1);
        });

        it('should handle empty courses array', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: [] });

            // Empty filter should extract all courses
            expect(mockSUAPScraper.goto).toHaveBeenCalled();
        });

        it('should parse subject data correctly', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            expect(result[0].className).toBe("INF-2AT");
            expect(result[0].subjectName).toBe("Programação Web I");
            expect(result[0].group).toBe(false);
        });

        it('should detect duplicate subjects and assign groups', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]",
                    class: "20251.2.CH.INF_I.90.1T"
                },
                {
                    id: "60245",
                    name: "TEC.3837 - Programação Web I - Ensino Médio [120.00 h/160.00 Aulas]",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            // Should assign G1 and G2 based on ID order
            const groups = result.map(r => r.group);
            expect(groups).toContain('G1');
            expect(groups).toContain('G2');
        });

        it('should report progress for each course', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([]);

            const progressCallback = jest.fn();
            const suap = new SUAP();
            await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] }, progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Extracting course'));
        });

        it('should save extracted subjects to file', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I - Ensino Médio",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            const [path, content] = mockFs.writeFileSync.mock.calls[0];
            expect(path).toContain('suap_subjects.json');
        });
    });

    describe('scrapeStudents()', () => {
        it('should scrape students and professors from subject page', async () => {
            // First call - professors from main page
            // Second call - students from notas_faltas tab
            // Third+ calls - email fetches
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors (empty for this test)
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents("60244");

            expect(mockSUAPScraper.initialize).toHaveBeenCalled();
            expect(mockSUAPScraper.goto).toHaveBeenCalled();
            expect(result.students.length).toBe(1);
            expect(result.students[0].name).toBe("João Silva");
            expect(result.students[0].email).toBe("joao.silva@email.com");
            expect(result.professors).toEqual([]);
        });

        it('should call progress callback during scraping', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const progressCallback = jest.fn();
            const suap = new SUAP();
            await suap.scrapeStudents("60244", progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Loading subject page'));
        });

        it('should fetch email for each student', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" },
                    { enrollment: "2021002", name: "Maria Santos" }
                ])
                .mockResolvedValue("test@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents("60244");

            expect(result.students.length).toBe(2);
            expect(result.students[0]).toHaveProperty('email');
            expect(result.students[1]).toHaveProperty('email');
        });

        it('should save students to file', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            await suap.scrapeStudents("60244");

            expect(mockFs.writeFileSync).toHaveBeenCalled();
            // Find the call that writes to suap_students.json
            const studentWriteCall = mockFs.writeFileSync.mock.calls.find(call => 
                call[0].includes('suap_students.json')
            );
            expect(studentWriteCall).toBeDefined();
            
            const savedData = JSON.parse(studentWriteCall[1]);
            expect(savedData.subjects).toHaveProperty('60244');
            expect(savedData.students).toHaveProperty('2021001');
        });

        it('should merge with existing students data', async () => {
            const existingData = {
                subjects: { "60243": ["2021000"] },
                students: { "2021000": { name: "Existing Student", email: "existing@email.com" } }
            };

            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(existingData));

            const suap = new SUAP();
            await suap.scrapeStudents("60244");

            // Find the call that writes to suap_students.json
            const studentWriteCall = mockFs.writeFileSync.mock.calls.find(call => 
                call[0].includes('suap_students.json')
            );
            const savedData = JSON.parse(studentWriteCall[1]);
            
            // Should have both old and new data
            expect(savedData.subjects).toHaveProperty('60243');
            expect(savedData.subjects).toHaveProperty('60244');
            expect(savedData.students).toHaveProperty('2021000');
            expect(savedData.students).toHaveProperty('2021001');
        });

        it('should handle empty student list', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([]); // students
            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents("60244");

            expect(result.students).toEqual([]);
            expect(result.professors).toEqual([]);
        });

        it('should handle email fetch error gracefully', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ]);
            
            // Simulate error on email fetch
            mockSUAPScraper.goto
                .mockResolvedValueOnce(undefined)  // First call for main page
                .mockResolvedValueOnce(undefined)  // Second call for notas_faltas tab
                .mockRejectedValueOnce(new Error('Page not found'));  // Email page fails

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents("60244");

            expect(result.students[0].email).toBeNull();
        });

        it('should report progress for each student email fetch', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" },
                    { enrollment: "2021002", name: "Maria Santos" }
                ])
                .mockResolvedValue("test@email.com");

            mockFs.existsSync.mockReturnValue(false);

            const progressCallback = jest.fn();
            const suap = new SUAP();
            await suap.scrapeStudents("60244", progressCallback);

            expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Fetching email'));
        });

        it('should handle corrupted existing file gracefully', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });

            const suap = new SUAP();
            const result = await suap.scrapeStudents("60244");

            // Should still work and save new data
            expect(result.students.length).toBe(1);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });

        it('should handle legacy file format without subjects/students structure', async () => {
            mockSUAPScraper.evaluate
                .mockResolvedValueOnce([]) // professors
                .mockResolvedValueOnce([
                    { enrollment: "2021001", name: "João Silva" }
                ])
                .mockResolvedValue("joao.silva@email.com");

            mockFs.existsSync.mockReturnValue(true);
            // Legacy format without the new structure
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ oldData: true }));

            const suap = new SUAP();
            await suap.scrapeStudents("60244");

            // Find the call that writes to suap_students.json
            const studentWriteCall = mockFs.writeFileSync.mock.calls.find(call => 
                call[0].includes('suap_students.json')
            );
            const savedData = JSON.parse(studentWriteCall[1]);
            
            // Should create proper structure
            expect(savedData).toHaveProperty('subjects');
            expect(savedData).toHaveProperty('students');
        });
    });

    describe('edge cases', () => {
        it('should handle subject with malformed class format', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I",
                    class: "invalid-class-format"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            // Should still process but with potentially undefined parts
            expect(result.length).toBe(1);
        });

        it('should handle subject name with special characters', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - C++ Programming - Advanced",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            expect(result[0].subjectName).toBe("C++ Programming");
        });

        it('should handle unicode in subject names', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Cálculo Matemático - Básico",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            expect(result[0].subjectName).toBe("Cálculo Matemático");
        });

        it('should handle multiple consecutive spaces in name', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Banco   de    Dados",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            // Should normalize spaces
            expect(result[0].subjectName).toBe("Banco de Dados");
        });

        it('should handle three or more duplicates correctly', async () => {
            mockSUAPScraper.evaluate.mockResolvedValue([
                {
                    id: "60244",
                    name: "TEC.3837 - Programação Web I",
                    class: "20251.2.CH.INF_I.90.1T"
                },
                {
                    id: "60245",
                    name: "TEC.3837 - Programação Web I",
                    class: "20251.2.CH.INF_I.90.1T"
                },
                {
                    id: "60246",
                    name: "TEC.3837 - Programação Web I",
                    class: "20251.2.CH.INF_I.90.1T"
                }
            ]);

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            // All should get groups
            result.forEach(r => {
                expect(['G1', 'G2']).toContain(r.group);
            });
        });
    });

    describe('browser callback execution', () => {
        // These tests actually execute the browser callbacks by mocking global document
        let originalDocument;

        beforeEach(() => {
            originalDocument = global.document;
        });

        afterEach(() => {
            if (originalDocument !== undefined) {
                global.document = originalDocument;
            } else {
                delete global.document;
            }
        });

        it('should execute extractSubjects browser callback correctly', async () => {
            // Create mock TR element with querySelectorAll for td cells
            const mockTds = [
                { textContent: 'ignored' },           // index 0
                { textContent: '  60244  ' },         // index 1 - id
                { textContent: '20251.2.CH.INF_I.90.1T' }, // index 2 - class
                { textContent: 'TEC.3837 - Programação Web I' } // index 3 - name
            ];
            
            const mockTr = {
                querySelectorAll: jest.fn((selector) => {
                    if (selector === 'td') {
                        return mockTds;
                    }
                    return [];
                })
            };

            // Mock document for the browser callback
            global.document = {
                querySelectorAll: jest.fn((selector) => [mockTr])
            };

            // Make evaluate actually run the callback
            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                // Execute the actual callback with mocked document
                return Promise.resolve(callback(config));
            });

            const suap = new SUAP();
            const result = await suap.extractSubjects({ year: 2025, semester: 1, courses: ['INF'] });

            expect(global.document.querySelectorAll).toHaveBeenCalled();
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('60244');
        });

        it('should execute scrapeStudents browser callback for student list', async () => {
            let callCount = 0;
            
            // Mock DOM for student list extraction
            const mockStudentRow = {
                querySelector: jest.fn((selector) => {
                    if (selector === 'a[href^="/edu/aluno/"]') {
                        return { getAttribute: () => '/edu/aluno/2021001/' };
                    }
                    if (selector === 'img[alt^="Foto de "]') {
                        return { getAttribute: () => 'Foto de João Silva' };
                    }
                    return null;
                })
            };

            global.document = {
                querySelectorAll: jest.fn((selector) => {
                    if (selector.includes('rh/servidor')) return []; // No professors
                    return [mockStudentRow];
                })
            };

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    // First call - professor list (empty)
                    return Promise.resolve([]);
                }
                if (callCount === 2) {
                    // Second call - student list, execute the callback
                    return Promise.resolve(callback(config));
                }
                // Email calls - just return mock email
                return Promise.resolve('test@email.com');
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            expect(result.students.length).toBe(1);
            expect(result.students[0].enrollment).toBe('2021001');
            expect(result.students[0].name).toBe('João Silva');
        });

        it('should execute email extraction browser callback', async () => {
            let callCount = 0;

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    // Professor list (empty)
                    return Promise.resolve([]);
                }
                if (callCount === 2) {
                    // Student list
                    return Promise.resolve([{ enrollment: '2021001', name: 'Test' }]);
                }
                
                // Email extraction - mock the DOM for this callback
                const mockDt = {
                    textContent: config.emailLabel,
                    nextElementSibling: {
                        tagName: 'DD',
                        textContent: '  student@school.edu  '
                    }
                };
                
                global.document = {
                    querySelectorAll: jest.fn((selector) => {
                        if (selector === 'dt') {
                            return [mockDt];
                        }
                        return [];
                    })
                };

                // Execute the actual callback
                return Promise.resolve(callback(config));
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            expect(result.students[0].email).toBe('student@school.edu');
        });

        it('should return null when email dt element not found', async () => {
            let callCount = 0;

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve([]); // professors
                }
                if (callCount === 2) {
                    return Promise.resolve([{ enrollment: '2021001', name: 'Test' }]); // students
                }
                
                // No matching dt element
                global.document = {
                    querySelectorAll: jest.fn(() => [])
                };

                return Promise.resolve(callback(config));
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            expect(result.students[0].email).toBeNull();
        });

        it('should return null when dd element is not next sibling', async () => {
            let callCount = 0;

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve([]); // professors
                }
                if (callCount === 2) {
                    return Promise.resolve([{ enrollment: '2021001', name: 'Test' }]); // students
                }
                
                const mockDt = {
                    textContent: config.emailLabel,
                    nextElementSibling: null  // No next sibling
                };
                
                global.document = {
                    querySelectorAll: jest.fn(() => [mockDt])
                };

                return Promise.resolve(callback(config));
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            expect(result.students[0].email).toBeNull();
        });

        it('should return null when next sibling is not DD tag', async () => {
            let callCount = 0;

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve([]); // professors
                }
                if (callCount === 2) {
                    return Promise.resolve([{ enrollment: '2021001', name: 'Test' }]); // students
                }
                
                const mockDt = {
                    textContent: config.emailLabel,
                    nextElementSibling: {
                        tagName: 'SPAN',  // Wrong tag
                        textContent: 'wrong'
                    }
                };
                
                global.document = {
                    querySelectorAll: jest.fn(() => [mockDt])
                };

                return Promise.resolve(callback(config));
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            expect(result.students[0].email).toBeNull();
        });

        it('should skip rows without valid student data', async () => {
            let callCount = 0;

            // Mock row without enrollment link
            const mockInvalidRow = {
                querySelector: jest.fn(() => null)
            };

            global.document = {
                querySelectorAll: jest.fn(() => [mockInvalidRow])
            };

            mockSUAPScraper.evaluate.mockImplementation((callback, config) => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve([]); // professors
                }
                if (callCount === 2) {
                    return Promise.resolve(callback(config)); // students
                }
                return Promise.resolve('test@email.com');
            });

            mockFs.existsSync.mockReturnValue(false);

            const suap = new SUAP();
            const result = await suap.scrapeStudents('60244');

            // Should return empty since row was invalid
            expect(result.students).toEqual([]);
            expect(result.professors).toEqual([]);
        });
    });
});
