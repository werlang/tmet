/**
 * AIMatch Model Tests
 * Tests for the AIMatch model with proper mocking of dependencies
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';
import { sampleMoodleSubjects, sampleSuapSubjects, sampleAIMatchResponse } from '../fixtures.js';

// Mock ChatAssist helper
const mockChatInstance = {
    chat: jest.fn().mockResolvedValue(sampleAIMatchResponse)
};

const mockChatAssist = jest.fn().mockImplementation(() => mockChatInstance);

jest.unstable_mockModule('../../helpers/chat-assist.js', () => ({
    default: mockChatAssist
}));

// Import AIMatch after mocking
const { default: AIMatch } = await import('../../models/AIMatch.js');

describe('AIMatch Model', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
        mockChatInstance.chat.mockResolvedValue(sampleAIMatchResponse);
    });

    describe('constructor', () => {
        it('should create a new AIMatch instance', () => {
            const aiMatch = new AIMatch();
            expect(aiMatch).toBeInstanceOf(AIMatch);
        });
    });

    describe('findMatches()', () => {
        it('should call ChatAssist with built prompt', async () => {
            const aiMatch = new AIMatch();
            const progressCallback = jest.fn();
            
            await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, progressCallback);

            expect(mockChatInstance.chat).toHaveBeenCalled();
            const [userMessage, systemPrompt] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain('MOODLE SUBJECTS');
            expect(userMessage).toContain('SUAP SUBJECTS');
        });

        it('should call progress callback during process', async () => {
            const aiMatch = new AIMatch();
            const progressCallback = jest.fn();
            
            await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, progressCallback);

            expect(progressCallback).toHaveBeenCalledWith({ message: 'Preparing AI prompt...' });
            expect(progressCallback).toHaveBeenCalledWith({ message: 'Analyzing subjects with AI...' });
            expect(progressCallback).toHaveBeenCalledWith({ message: 'Parsing AI response...' });
        });

        it('should filter matches by confidence > 0.8', async () => {
            const responseWithLowConfidence = `{"moodleFullname": "Test1", "suapIds": ["1"], "confidence": 0.95}
{"moodleFullname": "Test2", "suapIds": ["2"], "confidence": 0.5}`;

            mockChatInstance.chat.mockResolvedValue(responseWithLowConfidence);

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(1);
            expect(result[0].moodleFullname).toBe('Test1');
        });

        it('should parse valid JSONL response', async () => {
            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(2);
            expect(result[0]).toHaveProperty('moodleFullname');
            expect(result[0]).toHaveProperty('suapIds');
            expect(result[0]).toHaveProperty('confidence');
        });

        it('should handle null response', async () => {
            mockChatInstance.chat.mockResolvedValue('null');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result).toEqual([]);
        });

        it('should handle NULL (uppercase) response', async () => {
            mockChatInstance.chat.mockResolvedValue('NULL');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result).toEqual([]);
        });

        it('should handle malformed JSON lines', async () => {
            const responseWithBadLine = `{"moodleFullname": "Test1", "suapIds": ["1"], "confidence": 0.95}
not valid json
{"moodleFullname": "Test2", "suapIds": ["2"], "confidence": 0.9}`;

            mockChatInstance.chat.mockResolvedValue(responseWithBadLine);

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(2);
        });

        it('should skip objects missing required fields', async () => {
            const responseWithMissingFields = `{"moodleFullname": "Test1", "suapIds": ["1"], "confidence": 0.95}
{"moodleFullname": "Test2"}
{"suapIds": ["3"], "confidence": 0.9}`;

            mockChatInstance.chat.mockResolvedValue(responseWithMissingFields);

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(1);
        });

        it('should handle empty lines in response', async () => {
            const responseWithEmptyLines = `{"moodleFullname": "Test1", "suapIds": ["1"], "confidence": 0.95}

{"moodleFullname": "Test2", "suapIds": ["2"], "confidence": 0.9}
`;

            mockChatInstance.chat.mockResolvedValue(responseWithEmptyLines);

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(2);
        });

        it('should handle whitespace-only response', async () => {
            mockChatInstance.chat.mockResolvedValue('   \n  \n  ');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result).toEqual([]);
        });

        it('should handle null lines within JSONL', async () => {
            const responseWithNullLines = `{"moodleFullname": "Test1", "suapIds": ["1"], "confidence": 0.95}
null
{"moodleFullname": "Test2", "suapIds": ["2"], "confidence": 0.9}`;

            mockChatInstance.chat.mockResolvedValue(responseWithNullLines);

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(2);
        });

        it('should handle undefined progress callback', async () => {
            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, undefined);

            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle null progress callback', async () => {
            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, null);

            expect(result.length).toBeGreaterThan(0);
        });

        it('should include subject details in prompt', async () => {
            const aiMatch = new AIMatch();
            await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            
            // Should include Moodle subject details
            expect(userMessage).toContain('shortname');
            expect(userMessage).toContain('category');
            
            // Should include SUAP subject details
            expect(userMessage).toContain('ID:');
            expect(userMessage).toContain('Class:');
        });

        it('should pass correct options to chat', async () => {
            const aiMatch = new AIMatch();
            await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(mockChatInstance.chat).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.objectContaining({
                    temperature: 0.3,
                    maxTokens: 4096
                })
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty moodle subjects array', async () => {
            const aiMatch = new AIMatch();
            await aiMatch.findMatches([], sampleSuapSubjects, jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain('MOODLE SUBJECTS:');
        });

        it('should handle empty suap subjects array', async () => {
            const aiMatch = new AIMatch();
            await aiMatch.findMatches(sampleMoodleSubjects, [], jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain('SUAP SUBJECTS:');
        });

        it('should handle both empty arrays', async () => {
            const aiMatch = new AIMatch();
            await aiMatch.findMatches([], [], jest.fn());

            expect(mockChatInstance.chat).toHaveBeenCalled();
        });

        it('should handle special characters in subject names', async () => {
            const moodleWithSpecial = [
                { fullname: 'C++ Programming', shortname: 'CPP', category: '1' }
            ];
            const suapWithSpecial = [
                { id: '1', fullname: 'C++ Course', subjectName: 'C++', className: 'INF-1AT' }
            ];

            const aiMatch = new AIMatch();
            await aiMatch.findMatches(moodleWithSpecial, suapWithSpecial, jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain('C++');
        });

        it('should handle unicode in subject names', async () => {
            const moodleWithUnicode = [
                { fullname: 'Cálculo Matemático', shortname: 'CM', category: '1' }
            ];
            const suapWithUnicode = [
                { id: '1', fullname: 'Cálculo', subjectName: 'Cálculo', className: 'INF-1AT' }
            ];

            const aiMatch = new AIMatch();
            await aiMatch.findMatches(moodleWithUnicode, suapWithUnicode, jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain('Cálculo');
        });

        it('should handle confidence at exactly 0.8 (should be filtered)', async () => {
            mockChatInstance.chat.mockResolvedValue('{"moodleFullname": "Test", "suapIds": ["1"], "confidence": 0.8}');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(0);
        });

        it('should handle confidence at 0.81 (should pass)', async () => {
            mockChatInstance.chat.mockResolvedValue('{"moodleFullname": "Test", "suapIds": ["1"], "confidence": 0.81}');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(1);
        });

        it('should handle negative confidence values', async () => {
            mockChatInstance.chat.mockResolvedValue('{"moodleFullname": "Test", "suapIds": ["1"], "confidence": -0.5}');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(0);
        });

        it('should handle confidence > 1', async () => {
            mockChatInstance.chat.mockResolvedValue('{"moodleFullname": "Test", "suapIds": ["1"], "confidence": 1.5}');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(1);
        });

        it('should handle multiple suapIds in single match', async () => {
            mockChatInstance.chat.mockResolvedValue('{"moodleFullname": "Test", "suapIds": ["1", "2", "3"], "confidence": 0.95}');

            const aiMatch = new AIMatch();
            const result = await aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn());

            expect(result.length).toBe(1);
            expect(result[0].suapIds).toEqual(['1', '2', '3']);
        });

        it('should handle very long subject names', async () => {
            const longName = 'A'.repeat(500);
            const moodleWithLong = [
                { fullname: longName, shortname: 'LONG', category: '1' }
            ];

            const aiMatch = new AIMatch();
            await aiMatch.findMatches(moodleWithLong, sampleSuapSubjects, jest.fn());

            const [userMessage] = mockChatInstance.chat.mock.calls[0];
            expect(userMessage).toContain(longName);
        });

        it('should handle chat API error', async () => {
            mockChatInstance.chat.mockRejectedValue(new Error('API Error'));

            const aiMatch = new AIMatch();
            
            await expect(aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn()))
                .rejects.toThrow('API Error');
        });

        it('should throw error when response is undefined', async () => {
            mockChatInstance.chat.mockResolvedValue(undefined);

            const aiMatch = new AIMatch();
            
            await expect(aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn()))
                .rejects.toThrow('AI returned invalid response format');
        });

        it('should throw error when response is not a string', async () => {
            mockChatInstance.chat.mockResolvedValue({ invalid: 'object' });

            const aiMatch = new AIMatch();
            
            await expect(aiMatch.findMatches(sampleMoodleSubjects, sampleSuapSubjects, jest.fn()))
                .rejects.toThrow('AI returned invalid response format');
        });
    });
});
