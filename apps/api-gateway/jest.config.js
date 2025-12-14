module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/__fixtures__/**',
    '!src/**/*.interface.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical FinOps modules
    './src/modules/finops/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Encryption service must have 100% coverage
    './src/shared/services/encryption/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // AWS integrations
    './src/integrations/aws/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^bullmq$': '<rootDir>/src/__mocks__/bullmq.ts',
    '^ioredis$': '<rootDir>/src/__mocks__/ioredis.ts',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@faker-js)',
  ],
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
};
