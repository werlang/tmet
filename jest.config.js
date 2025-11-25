export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/__tests__/**/*.test.js'],
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'html'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/__tests__/',
        '/public/',
        '/samples/',
    ],
    testTimeout: 10000,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    // Clear mocks between tests
    clearMocks: true,
    // Restore mocks after each test
    restoreMocks: true,
    // Force exit after tests complete (handles open timers)
    forceExit: true,
};
