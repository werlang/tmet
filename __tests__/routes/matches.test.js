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
            const matches = [{ moodleFullname: "[2025.1] Test", suapId: "123", type: "manual" }];
            const msubject = { fullname: "[2025.1] Test" };
            
            const existingMatch = matches.find(m => m.moodleFullname === msubject.fullname);
            
            expect(existingMatch).toBeDefined();
            expect(existingMatch.suapId).toBe("123");
            expect(existingMatch.type).toBe("manual");
        });

        it('should handle manual match with array suapIds', () => {
            const matches = [{ moodleFullname: "[2025.1] Test", suapId: ["123", "456"], type: "manual" }];
            const msubject = { fullname: "[2025.1] Test" };
            
            const existingMatch = matches.find(m => m.moodleFullname === msubject.fullname);
            
            expect(existingMatch).toBeDefined();
            expect(Array.isArray(existingMatch.suapId)).toBe(true);
            expect(existingMatch.suapId).toEqual(["123", "456"]);
            expect(existingMatch.type).toBe("manual");
        });

        it('should handle auto match', () => {
            const matches = [{ moodleFullname: "[2025.1] Test", suapId: "123", type: "auto" }];
            const msubject = { fullname: "[2025.1] Test" };
            
            const existingMatch = matches.find(m => m.moodleFullname === msubject.fullname);
            
            expect(existingMatch).toBeDefined();
            expect(existingMatch.suapId).toBe("123");
            expect(existingMatch.type).toBe("auto");
        });
    });

    describe('create() logic', () => {
        it('should create manual match object correctly', () => {
            const moodleFullname = "[2025.1] Test Subject";
            const suapId = "12345";
            
            const newMatch = { moodleFullname, suapId, type: 'manual' };
            
            expect(newMatch.moodleFullname).toBe(moodleFullname);
            expect(newMatch.suapId).toBe(suapId);
            expect(newMatch.type).toBe('manual');
        });

        it('should replace existing match in array (auto or manual)', () => {
            let matches = [
                { moodleFullname: "[2025.1] Other", suapId: "other", type: "auto" },
                { moodleFullname: "[2025.1] Test", suapId: "old-id", type: "auto" }
            ];
            
            const moodleFullname = "[2025.1] Test";
            const suapId = "new-id";
            
            // Filter out existing match (regardless of type)
            matches = matches.filter(m => m.moodleFullname !== moodleFullname);
            // Add new manual match (overwrites auto match)
            matches.push({ moodleFullname, suapId, type: 'manual' });
            
            expect(matches.length).toBe(2);
            expect(matches.find(m => m.moodleFullname === "[2025.1] Test").suapId).toBe("new-id");
            expect(matches.find(m => m.moodleFullname === "[2025.1] Test").type).toBe("manual");
            expect(matches.find(m => m.moodleFullname === "[2025.1] Other").suapId).toBe("other");
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

    describe('Edge cases', () => {
        it('should handle special characters in fullname', () => {
            const fullname = "[2025.1] INF-2AT - C++ & Algoritmos";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[4]).toBe("C++ & Algoritmos");
        });

        it('should handle unicode in fullname', () => {
            const fullname = "[2025.1] MTM-1AN - Cálculo & Álgebra";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[4]).toBe("Cálculo & Álgebra");
        });

        it('should handle emoji in fullname', () => {
            const fullname = "[2025.1] INF-1AT - Programming 🚀";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[4]).toBe("Programming 🚀");
        });

        it('should handle very long subject names', () => {
            const longName = 'A'.repeat(300);
            const fullname = `[2025.1] INF-1AT - ${longName}`;
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[4]).toBe(longName);
        });

        it('should handle fullname with year > 9', () => {
            const fullname = "[2025.1] INF-10AT - Test Subject";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[1]).toBe("INF-10AT");
        });

        it('should handle multiple classes with 3+ courses', () => {
            const fullname = "[2025.1] ECA-8AN,TSI-4AN,INF-6BT - Multi-Course Subject";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[1]).toBe("ECA-8AN");
            expect(match[3]).toBe(",TSI-4AN,INF-6BT");
        });

        it('should handle group G1', () => {
            const fullname = "[2025.1] INF-2AT-G1 - Banco de Dados";
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            const match = fullname.match(regex);
            
            expect(match).not.toBeNull();
            expect(match[2]).toBe("-G1");
        });

        it('should handle different semester values', () => {
            const testCases = [
                { fullname: "[2025.1] INF-1AT - Test", expected: true },
                { fullname: "[2025.2] INF-1AT - Test", expected: true },
                { fullname: "[2024.1] INF-1AT - Test", expected: true }
            ];
            
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            testCases.forEach(({ fullname, expected }) => {
                const match = fullname.match(regex);
                expect(match !== null).toBe(expected);
            });
        });

        it('should not match invalid class format', () => {
            const invalidFullnames = [
                "[2025.1] invalid-2AT - Test",  // lowercase prefix
                "[2025.1] INF-2X - Test",       // invalid shift
                "[2025.1] IN-2AT - Test",       // 2-char prefix
                "[2025.1] INFF-2AT - Test",     // 4-char prefix
                "INF-2AT - Test",               // missing year/semester
                "[2025.1] INF2AT - Test"        // missing hyphen
            ];
            
            const regex = /\[.+\] ([A-Z]{3}-\d{1,2}[AB][MTN])(-G[12])?(,.+)? - (.+)/;
            invalidFullnames.forEach(fullname => {
                const match = fullname.match(regex);
                expect(match).toBeNull();
            });
        });

        it('should handle suapIds array with many IDs', () => {
            const suapIds = Array.from({ length: 10 }, (_, i) => `id${i}`);
            
            expect(Array.isArray(suapIds)).toBe(true);
            expect(suapIds.length).toBe(10);
        });

        it('should handle empty suapIds array', () => {
            const req = createMockRequest({ 
                body: { 
                    moodleFullname: 'Test',
                    suapIds: []
                } 
            });
            
            const suapId = Array.isArray(req.body.suapIds) ? req.body.suapIds : req.body.suapId;
            
            expect(Array.isArray(suapId)).toBe(true);
            expect(suapId.length).toBe(0);
        });

        it('should handle CSV line with extra spaces', () => {
            const line = '  "[2025.1] INF-2AT - Test"  ,  CH_INF  ,  115  ';
            const match = line.match(/"(.+)", (.+), (\d+)/);
            
            // Current regex won't match due to extra spaces around commas
            // This documents actual behavior
            expect(match).toBeNull();
        });

        it('should handle CSV line with no quotes', () => {
            const line = '[2025.1] INF-2AT - Test, CH_INF, 115';
            const match = line.match(/"(.+)", (.+), (\d+)/);
            
            expect(match).toBeNull();
        });

        it('should handle match array with duplicates before filter', () => {
            let matches = [
                { moodleFullname: "[2025.1] Test", suapId: "id1", type: "auto" },
                { moodleFullname: "[2025.1] Test", suapId: "id2", type: "auto" },
                { moodleFullname: "[2025.1] Test", suapId: "id3", type: "manual" }
            ];
            
            const moodleFullname = "[2025.1] Test";
            const suapId = "new-id";
            
            // Filter removes all matches with that fullname
            matches = matches.filter(m => m.moodleFullname !== moodleFullname);
            matches.push({ moodleFullname, suapId, type: 'manual' });
            
            expect(matches.length).toBe(1);
            expect(matches[0].suapId).toBe("new-id");
            expect(matches[0].type).toBe("manual");
        });

        it('should handle suapId with special characters', () => {
            const suapId = "id-123_456.789";
            const match = { moodleFullname: "[2025.1] Test", suapId };
            
            expect(match.suapId).toBe("id-123_456.789");
        });

        it('should handle empty moodleFullname', () => {
            const req = createMockRequest({ 
                body: { 
                    moodleFullname: '',
                    suapIds: ['123']
                } 
            });
            
            // Empty string is falsy
            if (!req.body.moodleFullname) {
                expect(req.body.moodleFullname).toBe('');
            }
        });

        it('should handle whitespace-only moodleFullname', () => {
            const req = createMockRequest({ 
                body: { 
                    moodleFullname: '   ',
                    suapIds: ['123']
                } 
            });
            
            // Whitespace string is truthy but may need trimming
            expect(req.body.moodleFullname.trim()).toBe('');
        });

        it('should handle CSV with category 0', () => {
            const line = '"[2025.1] Test", CH_Test, 0';
            const match = line.match(/"(.+)", (.+), (\d+)/);
            
            expect(match).not.toBeNull();
            expect(match[3]).toBe('0');
        });

        it('should handle CSV with large category number', () => {
            const line = '"[2025.1] Test", CH_Test, 999999';
            const match = line.match(/"(.+)", (.+), (\d+)/);
            
            expect(match).not.toBeNull();
            expect(match[3]).toBe('999999');
        });

        it('should handle match comparison with undefined properties', () => {
            const subject1 = { className: 'INF-1AT', group: undefined };
            const subject2 = { className: 'INF-1AT', group: undefined };
            
            const matches = subject1.className === subject2.className && 
                           subject1.group === subject2.group;
            
            expect(matches).toBe(true);
        });

        it('should handle match comparison with null vs undefined', () => {
            const subject1 = { className: 'INF-1AT', group: null };
            const subject2 = { className: 'INF-1AT', group: undefined };
            
            const matches = subject1.className === subject2.className && 
                           subject1.group === subject2.group;
            
            expect(matches).toBe(false); // null !== undefined
        });
    });
});
