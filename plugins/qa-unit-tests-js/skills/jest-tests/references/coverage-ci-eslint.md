# Jest coverage, CI, and ESLint

Deep reference for `jest-tests` SKILL.md. Consult when wiring coverage
gating, CI runs (`--ci`), JUnit reporting, or the ESLint test-globals config.

[jest-start]: https://jestjs.io/docs/getting-started

## Coverage

```bash
jest --coverage
```

Output formats: text, lcov, html, json, json-summary. Configure via
`coverageReporters` in `jest.config.js`. The `coverageThreshold` field fails
the run if coverage drops below thresholds.

For the `coverageThreshold` per-file pattern:

```javascript
coverageThreshold: {
  './src/critical-module/': {
    branches: 95,
    statements: 95,
  },
  './src/legacy/': {
    branches: 50,
  },
},
```

## CI integration

Per Jest CLI, `--ci` flag is critical for CI runs:

```yaml
# .github/workflows/test.yml
- run: npm ci
- run: npx jest --ci --coverage --maxWorkers=2 --reporters=default --reporters=jest-junit
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

`--ci` semantics:
- Disables snapshot writing on missing snapshots (fails instead - prevents accidental snapshot generation in CI)
- Disables interactive prompts
- Equivalent to `process.env.CI=true`

`--maxWorkers=2` is typical for GitHub-hosted runners (2 CPUs); tune per
runner specs.

For JUnit XML output (consumable by `junit-xml-analysis` in qa-test-reporting):

```bash
npm install --save-dev jest-junit
JEST_JUNIT_OUTPUT_FILE=./test-results/junit.xml \
  jest --ci --reporters=default --reporters=jest-junit
```

## ESLint integration

Per [jest-start][jest-start]:

```javascript
// eslint.config.js
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
]);
```

Or via `eslint-plugin-jest`:

```bash
npm install --save-dev eslint-plugin-jest
```

```json
{
  "overrides": [{
    "files": ["**/*.test.js", "**/*.spec.js"],
    "plugins": ["jest"],
    "extends": ["plugin:jest/recommended"]
  }]
}
```
