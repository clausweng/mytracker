const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: '@exercise-tracker/api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  // Several @nestjs packages (config, jwt, ...) ship ESM only; transform them
  // so the CommonJS Jest runtime can require them.
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/)'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  // The sources use NodeNext-style `./foo.js` specifiers; strip the extension
  // so Jest resolves the TypeScript sources, and resolve the workspace lib
  // to its source instead of its build output.
  moduleNameMapper: {
    '^@exercise-tracker/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // V8 coverage reflects the authored sources: the istanbul provider counts the
  // `typeof X === 'undefined' ? Object : X` ternaries that swc emits for
  // `emitDecoratorMetadata` as real, permanently half-covered branches.
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts',
    '!src/test/**',
    '!src/app/database/schema/**',
    '!src/app/database/seed.ts',
    // Type-only module: erased at compile time, so it is never executed.
    '!src/app/common/types/authenticated-user.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
