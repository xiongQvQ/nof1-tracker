module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Exclude entry file from coverage
    '!src/commands/**/*.ts', // Exclude newly refactored commands (TODO: add integration tests)
    '!src/utils/command-helpers.ts', // Exclude command helpers (TODO: add integration tests)
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  watchman: false,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  testTimeout: 5000,
};