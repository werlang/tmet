/**
 * Request Helper Tests
 * Tests for the Request helper with fetch mocking
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { suppressConsole } from '../setup.js';

// Store original fetch
const originalFetch = global.fetch;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocking
const { Request } = await import('../../helpers/request.js');

describe('Request Helper', () => {
    suppressConsole();
    let request;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        request = new Request({ url: '' });
    });

    afterEach(() => {
        global.fetch = mockFetch;
    });

    describe('post()', () => {
        it('should make POST request with JSON body', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await request.post('https://api.example.com', { data: 'test' });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.any(Headers),
                    body: JSON.stringify({ data: 'test' })
                })
            );
            expect(result).toEqual({ success: true });
        });

        it('should make POST request with empty body', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await request.post('https://api.example.com');

            expect(result).toEqual({ success: true });
        });
    });

    describe('get()', () => {
        it('should make GET request without query params', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await request.get('https://api.example.com');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com?',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toEqual({ data: 'test' });
        });

        it('should make GET request with query params', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await request.get('https://api.example.com', { key: 'value', foo: 'bar' });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com?key=value&foo=bar',
                expect.objectContaining({ method: 'GET' })
            );
        });
    });

    describe('fetch()', () => {
        it('should handle successful response', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await request.fetch('GET', 'https://api.example.com');

            expect(result).toEqual({ success: true });
        });

        it('should handle HTTP error', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await request.fetch('GET', 'https://api.example.com');

            // Should retry and succeed
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        it('should not retry when retry is false', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 404
            });

            await expect(request.fetch('GET', 'https://api.example.com', {}, { retry: false }))
                .rejects.toThrow('HTTP error! status: 404');
            
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on network error', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });

            const result = await request.fetch('GET', 'https://api.example.com');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        it('should throw error when retry is disabled and error occurs', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(request.fetch('GET', 'https://api.example.com', {}, { retry: false }))
                .rejects.toThrow('Network error');
        });

        it('should use custom timeout', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await request.fetch('GET', 'https://api.example.com', {}, { retry: true, timeout: 5000 });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com',
                expect.objectContaining({
                    signal: expect.any(AbortSignal)
                })
            );
        });
    });
});
