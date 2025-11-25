/**
 * Test Setup
 * Configure mocks and test environment
 */

import { jest } from '@jest/globals';

// Mock fs module
export const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
};

// Mock path module
export const mockPath = {
    resolve: jest.fn((...args) => args.join('/')),
};

/**
 * Create a mock Express request object
 */
export function createMockRequest(options = {}) {
    return {
        body: options.body || {},
        params: options.params || {},
        query: options.query || {},
        app: {
            locals: {
                jobQueue: options.jobQueue || null
            }
        },
        ...options
    };
}

/**
 * Create a mock Express response object
 */
export function createMockResponse() {
    const res = {
        statusCode: 200,
        _data: null,
        status: jest.fn(function(code) {
            this.statusCode = code;
            return this;
        }),
        json: jest.fn(function(data) {
            this._data = data;
            return this;
        }),
        send: jest.fn(function(data) {
            this._data = data;
            return this;
        }),
    };
    return res;
}

/**
 * Wait for a specific time (for async tests)
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Suppress console output during tests
 */
export function suppressConsole() {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
    };
    
    beforeEach(() => {
        console.log = jest.fn();
        console.error = jest.fn();
        console.warn = jest.fn();
    });
    
    afterEach(() => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
    });
    
    return originalConsole;
}
