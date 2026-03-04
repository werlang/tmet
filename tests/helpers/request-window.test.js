import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { RequestWindow } from '../../helpers/request-window.js';

describe('RequestWindow Helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('run()', () => {
        it('should use default window size when constructor argument is omitted', async () => {
            const rw = new RequestWindow();
            const taskA = jest.fn().mockResolvedValue('a');
            const taskB = jest.fn().mockResolvedValue('b');

            await expect(rw.run([taskA, taskB])).resolves.toBeUndefined();

            expect(taskA).toHaveBeenCalledTimes(1);
            expect(taskB).toHaveBeenCalledTimes(1);
        });

        it('should return immediately for empty task list', async () => {
            const rw = new RequestWindow(3);
            await expect(rw.run([])).resolves.toBeUndefined();
        });

        it('should return immediately for non-array taskFactories', async () => {
            const rw = new RequestWindow(3);
            await expect(rw.run(null)).resolves.toBeUndefined();
        });

        it('should execute all task factories', async () => {
            const rw = new RequestWindow(2, { maxRetries: 0, timeoutMs: 0 });
            const calls = [];
            const tasks = [
                async () => { calls.push('a'); },
                async () => { calls.push('b'); },
                async () => { calls.push('c'); }
            ];

            await rw.run(tasks);

            expect(calls).toHaveLength(3);
            expect(calls.sort()).toEqual(['a', 'b', 'c']);
        });

        it('should retry and eventually succeed', async () => {
            const rw = new RequestWindow(1, { maxRetries: 2, timeoutMs: 0, retryDelayMs: 0 });

            const taskFactory = jest
                .fn()
                .mockRejectedValueOnce(new Error('first fail'))
                .mockResolvedValueOnce('ok');

            await rw.run([taskFactory]);

            expect(taskFactory).toHaveBeenCalledTimes(2);
        });

        it('should throw last error after exhausting retries', async () => {
            const rw = new RequestWindow(1, { maxRetries: 2, timeoutMs: 0, retryDelayMs: 0 });

            const taskFactory = jest.fn().mockRejectedValue(new Error('always fails'));

            await expect(rw.run([taskFactory])).rejects.toThrow('always fails');
            expect(taskFactory).toHaveBeenCalledTimes(3);
        });

        it('should throw timeout error when task exceeds timeout', async () => {
            jest.useFakeTimers();
            const rw = new RequestWindow(1, { maxRetries: 0, timeoutMs: 50, retryDelayMs: 0 });

            const taskFactory = jest.fn(() => new Promise(() => {}));

            const runPromise = rw.run([taskFactory]);
            jest.advanceTimersByTime(60);

            await expect(runPromise).rejects.toThrow('timed out after 50ms');
            expect(taskFactory).toHaveBeenCalledTimes(1);
        });

        it('should execute without timeout wrapper when timeout is zero', async () => {
            const rw = new RequestWindow(1, { maxRetries: 0, timeoutMs: 0 });
            const taskFactory = jest.fn().mockResolvedValue('done');

            await rw.run([taskFactory]);

            expect(taskFactory).toHaveBeenCalledTimes(1);
        });

        it('should clear timeout and resolve when task completes before timeout', async () => {
            const rw = new RequestWindow(1, { maxRetries: 0, timeoutMs: 100, retryDelayMs: 0 });
            const taskFactory = jest.fn().mockResolvedValue('done');

            await expect(rw.run([taskFactory])).resolves.toBeUndefined();
            expect(taskFactory).toHaveBeenCalledTimes(1);
        });

        it('should reject with task error before timeout when task fails fast', async () => {
            const rw = new RequestWindow(1, { maxRetries: 0, timeoutMs: 100, retryDelayMs: 0 });
            const taskFactory = jest.fn().mockRejectedValue(new Error('task failed'));

            await expect(rw.run([taskFactory])).rejects.toThrow('task failed');
            expect(taskFactory).toHaveBeenCalledTimes(1);
        });

        it('should wait retry delay between attempts when retryDelayMs is positive', async () => {
            const rw = new RequestWindow(1, { maxRetries: 1, timeoutMs: 0, retryDelayMs: 1 });
            const taskFactory = jest
                .fn()
                .mockRejectedValueOnce(new Error('first fail'))
                .mockResolvedValueOnce('ok');

            await rw.run([taskFactory]);

            expect(taskFactory).toHaveBeenCalledTimes(2);
        });

        it('should clamp negative retries to zero', async () => {
            const rw = new RequestWindow(1, { maxRetries: -2, timeoutMs: 0, retryDelayMs: -10 });
            const taskFactory = jest.fn().mockRejectedValue(new Error('single attempt'));

            await expect(rw.run([taskFactory])).rejects.toThrow('single attempt');
            expect(taskFactory).toHaveBeenCalledTimes(1);
        });
    });
});
