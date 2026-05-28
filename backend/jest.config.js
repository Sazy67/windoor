/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 30000,
  // Run tests serially to avoid SQLite concurrency issues
  maxWorkers: 1,
  forceExit: true,
  // Global setup/teardown for the test DB
  globalSetup: '<rootDir>/src/__tests__/helpers/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/helpers/globalTeardown.ts',
};
