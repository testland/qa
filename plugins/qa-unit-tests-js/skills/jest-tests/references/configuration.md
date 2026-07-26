# Jest configuration

Deep reference for `jest-tests` SKILL.md. Consult when generating or tuning
`jest.config.js` - test environment, coverage collection, path aliases.

[jest-start]: https://jestjs.io/docs/getting-started

Generate config (per [jest-start][jest-start]):

```bash
npm init jest@latest
```

Common `jest.config.js` settings:

```javascript
module.exports = {
  testEnvironment: 'jsdom',          // 'jsdom' for browser; 'node' for backend
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{js,ts}', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',  // path aliases matching tsconfig
  },
};
```

`testEnvironment` defaults to `jsdom` in Jest 26 and earlier; from Jest 27+
defaults to `node`. Set explicitly to avoid surprise.
