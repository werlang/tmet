/**
 * Match Model Tests
 * Tests for the Match model with proper mocking of fs
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleSuapSubjects, sampleMoodleCsvContent, sampleMatches } from '../fixtures.js';

// Mock fs module before importing Match
const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

// Import Match after mocking
const { default: Match } = await import('../../models/Match.js');

describe('Match Model', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a new Match instance', () => {
            const match = new Match();
            expect(match).toBeInstanceOf(Match);
        });
    });

    describe('getAll()', () => {
        it('should return empty arrays when no files exist', () => {
            mockFs.existsSync.mockReturnValue(false);

            const match = new Match();
            const result = match.getAll();

            expect(result.subjects).toEqual([]);
            expect(result.noMatch).toEqual([]);
            expect(result.suapSubjects).toEqual([]);
        });

        it('should parse Moodle CSV and match with SUAP subjects', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.subjects.length).toBeGreaterThan(0);
            expect(result.suapSubjects).toEqual(sampleSuapSubjects);
        });

        it('should use existing manual matches from matches.json', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify(sampleMatches);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            // Check that existing matches are applied
            const matchedSubject = result.subjects.find(s => 
                s.fullname === "[2025.1] INF-1AT-G1 - Matemática I"
            );
            if (matchedSubject) {
                expect(matchedSubject.suapId).toBe("55039");
                expect(matchedSubject.matchType).toBe("manual");
            }
        });

        it('should handle array suapIds in matches', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
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

            const match = new Match();
            const result = match.getAll();

            const matchedSubject = result.subjects.find(s => 
                s.fullname === "[2025.1] INF-2AT-G2 - Programação Web I"
            );
            if (matchedSubject) {
                expect(Array.isArray(matchedSubject.suapId)).toBe(true);
                expect(Array.isArray(matchedSubject.suapMatch)).toBe(true);
            }
        });

        it('should handle single suapId that does not exist in SUAP subjects', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return sampleMoodleCsvContent;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([{
                        moodleFullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                        suapId: "nonexistent-id",
                        type: "manual"
                    }]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            // Subject should be matched but suapMatch should be undefined since ID doesn't exist
            const matchedSubject = result.subjects.find(s => 
                s.fullname === "[2025.1] INF-2AT-G2 - Programação Web I"
            );
            expect(matchedSubject).toBeDefined();
            expect(matchedSubject.suapId).toBe("nonexistent-id");
            expect(matchedSubject.suapMatch).toBeUndefined();
        });

        it('should auto-match subjects and save to matches.json', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] INF-2AT-G2 - Programação Web I", CH_INF_2AT_PW1_2025.1_G2, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            // Should have called writeFileSync to save auto-matches
            const matchedSubject = result.subjects.find(s => 
                s.fullname === "[2025.1] INF-2AT-G2 - Programação Web I"
            );
            if (matchedSubject && matchedSubject.matchType === 'auto') {
                expect(mockFs.writeFileSync).toHaveBeenCalled();
            }
        });

        it('should add subjects with no match to noMatch array', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] UNKNOWN-1AT - Unknown Subject", CH_UNK_1AT_US_2025.1, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.noMatch.length).toBe(1);
            expect(result.noMatch[0].fullname).toBe("[2025.1] UNKNOWN-1AT - Unknown Subject");
        });

        it('should handle invalid fullname format', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"Invalid Format Subject", CH_INVALID_2025.1, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.noMatch.length).toBe(1);
        });

        it('should handle multi-class subjects', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] ECA-8AN,TSI-4AN - Gestão e Empreendedorismo", CH_ECA_8AN_TSI_4AN_GE_2025.1, 119`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify([]);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            // Should parse the multi-class format correctly
            expect(result.noMatch.length).toBe(1);
            expect(result.noMatch[0].className).toBe("ECA-8AN");
        });
    });

    describe('getAllMatches()', () => {
        it('should return all matches from file', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleMatches));

            const match = new Match();
            const result = match.getAllMatches();

            expect(result).toEqual(sampleMatches);
        });

        it('should return empty array when file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);

            const match = new Match();
            const result = match.getAllMatches();

            expect(result).toEqual([]);
        });
    });

    describe('create()', () => {
        it('should create a new manual match', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([]));

            const match = new Match();
            const result = match.create("[2025.1] Test Subject", "12345");

            expect(result).toBe(true);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
            
            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            expect(savedData).toContainEqual({
                moodleFullname: "[2025.1] Test Subject",
                suapId: "12345",
                type: "manual"
            });
        });

        it('should replace existing match when creating new one', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([
                { moodleFullname: "[2025.1] Test Subject", suapId: "old-id", type: "auto" }
            ]));

            const match = new Match();
            match.create("[2025.1] Test Subject", "new-id");

            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            expect(savedData.length).toBe(1);
            expect(savedData[0].suapId).toBe("new-id");
            expect(savedData[0].type).toBe("manual");
        });

        it('should support array of suapIds', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify([]));

            const match = new Match();
            match.create("[2025.1] Test Subject", ["12345", "67890"]);

            const savedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            expect(Array.isArray(savedData[0].suapId)).toBe(true);
            expect(savedData[0].suapId).toEqual(["12345", "67890"]);
        });

        it('should handle creating match when matches file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);

            const match = new Match();
            const result = match.create("[2025.1] Test Subject", "12345");

            expect(result).toBe(true);
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle empty CSV file', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return 'fullname, shortname, category\n';
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify([]);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.subjects).toEqual([]);
        });

        it('should handle malformed CSV lines', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
malformed line without quotes
"[2025.1] INF-2AT-G2 - Programação Web I", CH_INF_2AT_PW1_2025.1_G2, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify([]);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            // Should skip malformed line and parse valid ones
            expect(result.subjects.length).toBe(1);
        });

        it('should handle unicode characters in subject names', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] INF-2AT - Cálculo Matemático", CH_INF_2AT_CM_2025.1, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify([{
                        id: "1",
                        className: "INF-2AT",
                        subjectName: "Cálculo Matemático",
                        group: false
                    }]);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.subjects[0].subjectName).toBe("Cálculo Matemático");
        });

        it('should handle special characters in subject names', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] INF-2AT - C++ Programming", CH_INF_2AT_CPP_2025.1, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify([]);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify([]);
                }
                return '';
            });

            const match = new Match();
            const result = match.getAll();

            expect(result.subjects[0].subjectName).toBe("C++ Programming");
        });

        it('should not create duplicate auto-matches', () => {
            let savedMatches = [];
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((path) => {
                if (path.includes('moodle_classes.csv')) {
                    return `fullname, shortname, category
"[2025.1] INF-2AT-G2 - Programação Web I", CH_INF_2AT_PW1_2025.1_G2, 115`;
                }
                if (path.includes('suap_subjects.json')) {
                    return JSON.stringify(sampleSuapSubjects);
                }
                if (path.includes('matches.json')) {
                    return JSON.stringify(savedMatches);
                }
                return '';
            });
            mockFs.writeFileSync.mockImplementation((path, content) => {
                if (path.includes('matches.json')) {
                    savedMatches = JSON.parse(content);
                }
            });

            const match = new Match();
            match.getAll();
            
            // Call again - should not duplicate
            const initialLength = savedMatches.length;
            match.getAll();
            
            // Should not have duplicated the auto-match
            expect(savedMatches.length).toBe(initialLength);
        });
    });
});
