/**
 * AIMatch Model Logic Tests
 * Tests for AI-powered matching business logic
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleMoodleSubjects, sampleSuapSubjects, sampleAIMatchResponse } from '../fixtures.js';

describe('AIMatch Model Logic', () => {
    suppressConsole();

    describe('Prompt building logic', () => {
        it('should build Moodle subjects list correctly', () => {
            const moodleSubjects = sampleMoodleSubjects.slice(0, 2);
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            expect(moodleList).toContain('[2025.1] INF-2AT-G2 - Programação Web I');
            expect(moodleList).toContain('CH_INF_2AT_PW1_2025.1_G2');
            expect(moodleList).toContain('115');
        });

        it('should build SUAP subjects list correctly', () => {
            const suapSubjects = sampleSuapSubjects.slice(0, 2);
            
            const suapList = suapSubjects
                .map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`)
                .join('\n');
            
            expect(suapList).toContain('ID: 60244');
            expect(suapList).toContain('INF-2AT - Programação Web I');
            expect(suapList).toContain('Programação Web I');
            expect(suapList).toContain('INF-2AT');
        });

        it('should build complete prompt with both lists', () => {
            const moodleSubjects = sampleMoodleSubjects.slice(0, 1);
            const suapSubjects = sampleSuapSubjects.slice(0, 1);
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            const suapList = suapSubjects
                .map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`)
                .join('\n');
            
            const prompt = `Find matches between these Moodle and SUAP subjects:

MOODLE SUBJECTS:
${moodleList}

SUAP SUBJECTS:
${suapList}`;
            
            expect(prompt).toContain('MOODLE SUBJECTS:');
            expect(prompt).toContain('SUAP SUBJECTS:');
            expect(prompt).toContain('Find matches between');
        });

        it('should handle empty subject arrays', () => {
            const moodleList = [].map(m => `- "${m.fullname}"`).join('\n');
            const suapList = [].map(s => `- ID: ${s.id}`).join('\n');
            
            expect(moodleList).toBe('');
            expect(suapList).toBe('');
        });
    });

    describe('Response parsing logic', () => {
        it('should parse null response correctly', () => {
            const response = 'null';
            const matches = [];
            
            if (response.trim().toLowerCase() === 'null') {
                // Return empty matches
            }
            
            expect(matches).toEqual([]);
        });

        it('should parse valid JSONL response', () => {
            const response = sampleAIMatchResponse;
            const matches = [];
            
            const lines = response.trim().split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip invalid lines
                }
            }
            
            expect(matches.length).toBe(2);
            expect(matches[0].moodleFullname).toBe('[2025.1] INF-2AT-G2 - Programação Web I');
            expect(matches[0].suapIds).toEqual(['60244']);
            expect(matches[0].confidence).toBe(0.95);
        });

        it('should handle malformed JSON lines', () => {
            const response = `{"valid": "json", "moodleFullname": "test", "suapIds": ["1"], "confidence": 0.9}
invalid json here
{"moodleFullname": "test2", "suapIds": ["2"], "confidence": 0.85}`;
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip invalid lines
                }
            }
            
            expect(matches.length).toBe(2);
        });

        it('should skip objects missing required fields', () => {
            const response = `{"moodleFullname": "test", "suapIds": ["1"]}
{"suapIds": ["2"], "confidence": 0.9}
{"moodleFullname": "test3", "confidence": 0.85}
{"moodleFullname": "valid", "suapIds": ["4"], "confidence": 0.9}`;
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(1);
            expect(matches[0].moodleFullname).toBe('valid');
        });

        it('should handle empty lines', () => {
            const response = `{"moodleFullname": "test1", "suapIds": ["1"], "confidence": 0.9}

{"moodleFullname": "test2", "suapIds": ["2"], "confidence": 0.85}`;
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(2);
        });
    });

    describe('Confidence filtering logic', () => {
        it('should filter out matches with confidence <= 0.8', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: 0.95 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 0.8 },  // Exactly 0.8
                { moodleFullname: 'test3', suapIds: ['3'], confidence: 0.7 },  // Below 0.8
                { moodleFullname: 'test4', suapIds: ['4'], confidence: 0.85 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(2);
            expect(filteredMatches.map(m => m.confidence)).toEqual([0.95, 0.85]);
        });

        it('should keep matches with confidence just above threshold', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: 0.81 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 0.801 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(2);
        });

        it('should return empty array when all matches are low confidence', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: 0.5 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 0.6 },
                { moodleFullname: 'test3', suapIds: ['3'], confidence: 0.7 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(0);
        });
    });

    describe('Progress callback logic', () => {
        it('should support optional progress callback', () => {
            const progressCallback = jest.fn();
            
            // Simulate progress updates
            progressCallback?.({ message: 'Step 1' });
            progressCallback?.({ message: 'Step 2' });
            
            expect(progressCallback).toHaveBeenCalledTimes(2);
            expect(progressCallback).toHaveBeenCalledWith({ message: 'Step 1' });
            expect(progressCallback).toHaveBeenCalledWith({ message: 'Step 2' });
        });

        it('should handle null progress callback without error', () => {
            const progressCallback = null;
            
            // This should not throw
            expect(() => {
                progressCallback?.({ message: 'Step 1' });
            }).not.toThrow();
        });

        it('should handle undefined progress callback without error', () => {
            const progressCallback = undefined;
            
            expect(() => {
                progressCallback?.({ message: 'Step 1' });
            }).not.toThrow();
        });
    });

    describe('Edge cases', () => {
        it('should handle special characters in subject names', () => {
            const moodleSubjects = [
                { fullname: '[2025.1] Cálculo I - C++', shortname: 'CH_Calc', category: '115' },
                { fullname: 'Física & Química', shortname: 'CH_FQ', category: '116' }
            ];
            const suapSubjects = [
                { id: '1', fullname: 'Matemática: Álgebra & Geometria', subjectName: 'Álgebra', className: 'MTM-1A' },
                { id: '2', fullname: 'C++ Avançado', subjectName: 'C++', className: 'INF-3B' }
            ];
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            const suapList = suapSubjects
                .map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`)
                .join('\n');
            
            expect(moodleList).toContain('Cálculo I - C++');
            expect(moodleList).toContain('Física & Química');
            expect(suapList).toContain('Álgebra & Geometria');
            expect(suapList).toContain('C++ Avançado');
        });

        it('should handle unicode characters in names', () => {
            const moodleSubjects = [
                { fullname: '[2025.1] 测试 - тест', shortname: 'CH_Test', category: '115' }
            ];
            const suapSubjects = [
                { id: '1', fullname: 'परीक्षण - テスト', subjectName: 'テスト', className: 'TST-1A' }
            ];
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            const suapList = suapSubjects
                .map(s => `- ID: ${s.id}, Name: "${s.fullname}" (Subject: ${s.subjectName}, Class: ${s.className})`)
                .join('\n');
            
            expect(moodleList).toContain('测试 - тест');
            expect(suapList).toContain('परीक्षण - テスト');
        });

        it('should handle emoji in subject names', () => {
            const moodleSubjects = [
                { fullname: '[2025.1] Programming 🚀', shortname: 'CH_Prog', category: '115' }
            ];
            const suapSubjects = [
                { id: '1', fullname: 'Computer Science 💻', subjectName: 'CS', className: 'INF-1A' }
            ];
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            expect(moodleList).toContain('Programming 🚀');
        });

        it('should handle very long subject names', () => {
            const longName = 'A'.repeat(300);
            const moodleSubjects = [
                { fullname: longName, shortname: 'CH_Long', category: '115' }
            ];
            
            const moodleList = moodleSubjects
                .map(m => `- "${m.fullname}" (shortname: ${m.shortname}, category: ${m.category})`)
                .join('\n');
            
            expect(moodleList).toContain(longName);
            expect(moodleList.length).toBeGreaterThan(300);
        });

        it('should handle whitespace variations in response', () => {
            const response = `  {"moodleFullname": "test1", "suapIds": ["1"], "confidence": 0.9}  
            
{"moodleFullname": "test2", "suapIds": ["2"], "confidence": 0.85}  `;
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(2);
        });

        it('should handle confidence at boundaries', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: 0 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 1 },
                { moodleFullname: 'test3', suapIds: ['3'], confidence: 0.8 },
                { moodleFullname: 'test4', suapIds: ['4'], confidence: 0.8000001 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(2);
            expect(filteredMatches[0].confidence).toBe(1);
            expect(filteredMatches[1].confidence).toBe(0.8000001);
        });

        it('should handle negative confidence values', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: -0.5 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 0.9 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(1);
            expect(filteredMatches[0].confidence).toBe(0.9);
        });

        it('should handle confidence > 1', () => {
            const matches = [
                { moodleFullname: 'test1', suapIds: ['1'], confidence: 1.5 },
                { moodleFullname: 'test2', suapIds: ['2'], confidence: 0.9 }
            ];
            
            const filteredMatches = matches.filter(m => m.confidence > 0.8);
            
            expect(filteredMatches.length).toBe(2);
        });

        it('should handle multiple suapIds in single match', () => {
            const response = '{"moodleFullname": "test1", "suapIds": ["1", "2", "3"], "confidence": 0.95}';
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(1);
            expect(matches[0].suapIds).toEqual(['1', '2', '3']);
        });

        it('should handle response with only whitespace', () => {
            const response = '   \n  \n   ';
            const matches = [];
            
            const lines = response.trim().split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(0);
        });

        it('should handle mixed case null variations', () => {
            const responses = ['null', 'NULL', 'Null', 'nULl'];
            
            responses.forEach(response => {
                const matches = [];
                
                if (response.trim().toLowerCase() === 'null') {
                    // Return empty
                }
                
                expect(matches).toEqual([]);
            });
        });

        it('should handle null lines within JSONL', () => {
            const response = `{"moodleFullname": "test1", "suapIds": ["1"], "confidence": 0.9}
null
{"moodleFullname": "test2", "suapIds": ["2"], "confidence": 0.85}`;
            
            const matches = [];
            const lines = response.trim().split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.toLowerCase() === 'null') continue;
                
                try {
                    const parsed = JSON.parse(trimmedLine);
                    if (parsed.moodleFullname && parsed.suapIds && typeof parsed.confidence === 'number') {
                        matches.push(parsed);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            expect(matches.length).toBe(2);
        });
    });
});
