/**
 * ChatAssist Helper Tests
 * Tests for the ChatAssist helper with fetch mocking
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';

// Store original fetch
const originalFetch = global.fetch;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock config
jest.unstable_mockModule('../../config/chat-assist.js', () => ({
    default: {
        url: 'https://api.example.com/chat',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'Default system prompt'
    }
}));

// Set required env var
process.env.CHAT_ASSIST_API_KEY = 'test-api-key';

// Import after mocking
const { default: ChatAssist } = await import('../../helpers/chat-assist.js');

describe('ChatAssist Helper', () => {
    suppressConsole();

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        // Restore original fetch if tests modified it
        global.fetch = mockFetch;
    });

    describe('constructor', () => {
        it('should create instance with default model', () => {
            const chat = new ChatAssist();
            expect(chat).toBeInstanceOf(ChatAssist);
        });

        it('should create instance with custom model', () => {
            const chat = new ChatAssist('gpt-3.5-turbo');
            expect(chat).toBeInstanceOf(ChatAssist);
        });

        it('should throw error when API key is missing', async () => {
            const originalKey = process.env.CHAT_ASSIST_API_KEY;
            delete process.env.CHAT_ASSIST_API_KEY;
            
            // Expect constructor to throw when API key is missing
            expect(() => new ChatAssist()).toThrow('API_KEY environment variable is required');
            
            // Restore key for other tests
            process.env.CHAT_ASSIST_API_KEY = originalKey;
        });
    });

    describe('chat()', () => {
        it('should send chat request and return response', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Hello, world!' } }]
                })
            });

            const chat = new ChatAssist();
            const result = await chat.chat('Hello');

            expect(mockFetch).toHaveBeenCalled();
            expect(result).toBe('Hello, world!');
        });

        it('should use custom system prompt', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response' } }]
                })
            });

            const chat = new ChatAssist();
            await chat.chat('Hello', 'You are a helpful assistant.');

            const [url, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options.body);
            expect(body.messages[0].content).toBe('You are a helpful assistant.');
        });

        it('should pass custom temperature and maxTokens', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response' } }]
                })
            });

            const chat = new ChatAssist();
            await chat.chat('Hello', 'System', { temperature: 0.5, maxTokens: 500 });

            const [url, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options.body);
            expect(body.temperature).toBe(0.5);
            expect(body.max_tokens).toBe(500);
        });

        it('should maintain conversation history when keepHistory is true', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response 1' } }]
                })
            });

            const chat = new ChatAssist();
            await chat.chat('Hello', 'System', { keepHistory: true });
            
            // Second call should include history
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response 2' } }]
                })
            });
            
            await chat.chat('Follow up', 'System', { keepHistory: true });

            const [url, options] = mockFetch.mock.calls[1];
            const body = JSON.parse(options.body);
            // Should have system + previous user + previous assistant + current user
            expect(body.messages.length).toBe(4);
        });

        it('should handle API error response', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: () => Promise.resolve({
                    error: { message: 'Invalid API key' }
                })
            });

            const chat = new ChatAssist();
            
            await expect(chat.chat('Hello')).rejects.toThrow('API error (401)');
        });

        it('should handle API error without message', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: () => Promise.resolve({})
            });

            const chat = new ChatAssist();
            
            await expect(chat.chat('Hello')).rejects.toThrow('API error (500)');
        });

        it('should throw error when no response content', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: {} }]
                })
            });

            const chat = new ChatAssist();
            
            await expect(chat.chat('Hello')).rejects.toThrow('No response content from API');
        });

        it('should throw error when choices is empty', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ choices: [] })
            });

            const chat = new ChatAssist();
            
            await expect(chat.chat('Hello')).rejects.toThrow('No response content from API');
        });

        it('should handle fetch network error', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const chat = new ChatAssist();
            
            await expect(chat.chat('Hello')).rejects.toThrow('Network error');
        });
    });

    describe('complete()', () => {
        it('should call chat with keepHistory false', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Completed' } }]
                })
            });

            const chat = new ChatAssist();
            const result = await chat.complete('Complete this');

            expect(result).toBe('Completed');
        });
    });

    describe('history management', () => {
        it('should clear history', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Response' } }]
                })
            });

            const chat = new ChatAssist();
            await chat.chat('Hello', 'System', { keepHistory: true });
            
            chat.clearHistory();
            
            expect(chat.getHistory()).toEqual([]);
        });

        it('should get history', () => {
            const chat = new ChatAssist();
            const history = chat.getHistory();
            expect(Array.isArray(history)).toBe(true);
        });

        it('should set history', () => {
            const chat = new ChatAssist();
            const history = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' }
            ];
            
            chat.setHistory(history);
            
            expect(chat.getHistory()).toEqual(history);
        });

        it('should throw error when setting invalid history', () => {
            const chat = new ChatAssist();
            
            expect(() => chat.setHistory('not an array')).toThrow('History must be an array');
        });

        it('should return copy of history, not reference', () => {
            const chat = new ChatAssist();
            const history1 = chat.getHistory();
            history1.push({ role: 'test', content: 'test' });
            
            const history2 = chat.getHistory();
            expect(history2).toEqual([]);
        });
    });
});
