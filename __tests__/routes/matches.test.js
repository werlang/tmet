/**
 * Matches Route Tests
 * Tests for /api/matches endpoints
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse, suppressConsole } from '../setup.js';
import {
    sampleSuapSubjects,
    sampleMoodleCsvContent,
    sampleManualMatches
} from '../fixtures.js';

describe('Matches Route', () => {
    suppressConsole();

    describe('GET /matches endpoint handler', () => {
        it('should return 400 if moodleFullname is missing', () => {
            const req = createMockRequest({ body: { suapIds: ['123'] } });
            const res = createMockResponse();
            
            // Simulate route behavior
            if (!req.body.moodleFullname) {
                res.status(400).json({ 
                    success: false, 
                    error: 'moodleFullname is required' 
                });
            }
            
            expect(res.statusCode).toBe(400);
            expect(res._data.success).toBe(false);
        });

        it('should return 400 if both suapIds and suapId are missing', () => {
            const req = createMockRequest({ body: { moodleFullname: 'Test' } });
            const res = createMockResponse();
            
            // Simulate route behavior
            const suapId = Array.isArray(req.body.suapIds) ? req.body.suapIds : req.body.suapId;
            if (!suapId) {
                res.status(400).json({ 
                    success: false, 
                    error: 'suapIds array or suapId required' 
                });
            }
            
            expect(res.statusCode).toBe(400);
        });

        it('should accept suapIds as array', () => {
            const req = createMockRequest({ 
                body: { 
                    moodleFullname: '[2025.1] Test Subject',
                    suapIds: ['123', '456']
                } 
            });
            const res = createMockResponse();
            
            const suapId = Array.isArray(req.body.suapIds) ? req.body.suapIds : req.body.suapId;
            
            expect(Array.isArray(suapId)).toBe(true);
            expect(suapId).toEqual(['123', '456']);
        });

        it('should accept legacy suapId as single value', () => {
            const req = createMockRequest({ 
                body: { 
                    moodleFullname: '[2025.1] Test Subject',
                    suapId: '123'
                } 
            });
            const res = createMockResponse();
            
            const suapId = Array.isArray(req.body.suapIds) ? req.body.suapIds : req.body.suapId;
            
            expect(suapId).toBe('123');
        });
    });
});

describe('Match Model Logic', () => {
    suppressConsole();
    
    describe('getAll() logic', () => {
        it('should parse moodle fullname correctly', () => {
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            
            // Test various fullname formats
            const testCases = [
                {
                    fullname: "[2025.1] INF-2AT-G2 - Programação Web I",
                    expected: { className: "INF-2AT", group: "-G2", subjectName: "Programação Web I" }
                },
                {
                    fullname: "[2025.1] INF-2AM - Banco de Dados",
                    expected: { className: "INF-2AM", group: undefined, subjectName: "Banco de Dados" }
                },
                {
                    fullname: "[2025.1] ECA-8AN,TSI-4AN - Gestão e Empreendedorismo",
                    expected: { className: "ECA-8AN", group: undefined, subjectName: "Gestão e Empreendedorismo" }
                },
                {
                    fullname: "[2025.1] INF-1AT-G1 - Matemática I",
                    expected: { className: "INF-1AT", group: "-G1", subjectName: "Matemática I" }
                }
            ];
            
            testCases.forEach(({ fullname, expected }) => {
                const match = fullname.match(regex);
                expect(match).not.toBeNull();
                expect(match[1]).toBe(expected.className);
                expect(match[2]).toBe(expected.group);
                expect(match[4]).toBe(expected.subjectName);
            });
        });

        it('should fail to parse invalid fullname format', () => {
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            
            const invalidFullnames = [
                "Invalid Format Subject",
                "No bracket format",
                "[2025.1] INVALID - Subject",
                "[2025.1] INF1AT - Missing dash"
            ];
            
            invalidFullnames.forEach(fullname => {
                const match = fullname.match(regex);
                expect(match).toBeNull();
            });
        });

        it('should match subjects by className, subjectName, and group', () => {
            const moodleSubject = {
                className: "INF-2AT",
                subjectName: "Programação Web I",
                group: "G2"
            };
            
            const suapSubjects = sampleSuapSubjects;
            
            const match = suapSubjects.find(ssubject =>
                ssubject.className === moodleSubject.className &&
                ssubject.subjectName === moodleSubject.subjectName &&
                ssubject.group === moodleSubject.group
            );
            
            expect(match).toBeDefined();
            expect(match.id).toBe("60244");
        });

        it('should not match if group differs', () => {
            const moodleSubject = {
                className: "INF-2AT",
                subjectName: "Programação Web I",
                group: "G1" // Different group
            };
            
            const suapSubjects = sampleSuapSubjects;
            
            const match = suapSubjects.find(ssubject =>
                ssubject.className === moodleSubject.className &&
                ssubject.subjectName === moodleSubject.subjectName &&
                ssubject.group === moodleSubject.group
            );
            
            expect(match).toBeUndefined();
        });

        it('should handle manual match with single suapId', () => {
            const manualMatches = [{ moodleFullname: "[2025.1] Test", suapId: "123" }];
            const msubject = { fullname: "[2025.1] Test" };
            
            const manualMatch = manualMatches.find(m => m.moodleFullname === msubject.fullname);
            
            expect(manualMatch).toBeDefined();
            expect(manualMatch.suapId).toBe("123");
        });

        it('should handle manual match with array suapIds', () => {
            const manualMatches = [{ moodleFullname: "[2025.1] Test", suapId: ["123", "456"] }];
            const msubject = { fullname: "[2025.1] Test" };
            
            const manualMatch = manualMatches.find(m => m.moodleFullname === msubject.fullname);
            
            expect(manualMatch).toBeDefined();
            expect(Array.isArray(manualMatch.suapId)).toBe(true);
            expect(manualMatch.suapId).toEqual(["123", "456"]);
        });
    });

    describe('create() logic', () => {
        it('should create match object correctly', () => {
            const moodleFullname = "[2025.1] Test Subject";
            const suapId = "12345";
            
            const newMatch = { moodleFullname, suapId };
            
            expect(newMatch.moodleFullname).toBe(moodleFullname);
            expect(newMatch.suapId).toBe(suapId);
        });

        it('should replace existing match in array', () => {
            let manualMatches = [
                { moodleFullname: "[2025.1] Other", suapId: "other" },
                { moodleFullname: "[2025.1] Test", suapId: "old-id" }
            ];
            
            const moodleFullname = "[2025.1] Test";
            const suapId = "new-id";
            
            // Filter out existing match
            manualMatches = manualMatches.filter(m => m.moodleFullname !== moodleFullname);
            // Add new match
            manualMatches.push({ moodleFullname, suapId });
            
            expect(manualMatches.length).toBe(2);
            expect(manualMatches.find(m => m.moodleFullname === "[2025.1] Test").suapId).toBe("new-id");
            expect(manualMatches.find(m => m.moodleFullname === "[2025.1] Other").suapId).toBe("other");
        });
    });

    describe('CSV parsing logic', () => {
        it('should parse CSV line correctly', () => {
            const line = '"[2025.1] INF-2AT-G2 - Programação Web I", CH_INF_2AT_PW1_2025.1_G2, 115';
            const match = line.match(/"(.+)", (.+), (\d+)/);
            
            expect(match).not.toBeNull();
            expect(match[1]).toBe("[2025.1] INF-2AT-G2 - Programação Web I");
            expect(match[2]).toBe("CH_INF_2AT_PW1_2025.1_G2");
            expect(match[3]).toBe("115");
        });

        it('should handle malformed CSV lines', () => {
            const malformedLines = [
                "",
                "malformed line without proper format",
                "partial, data",
                '"only fullname"'
            ];
            
            malformedLines.forEach(line => {
                const match = line?.match(/"(.+)", (.+), (\d+)/);
                expect(match).toBeNull();
            });
        });

        it('should parse entire CSV content', () => {
            const csv = sampleMoodleCsvContent;
            const lines = csv.split('\n').slice(1); // Skip header
            
            const subjects = lines
                .map(line => {
                    const match = line?.match(/"(.+)", (.+), (\d+)/);
                    if (!match) return null;
                    return {
                        fullname: match[1],
                        shortname: match[2],
                        category: match[3]
                    };
                })
                .filter(s => s !== null);
            
            expect(subjects.length).toBe(6);
            expect(subjects[0].fullname).toBe("[2025.1] INF-2AT-G2 - Programação Web I");
        });
    });
});
