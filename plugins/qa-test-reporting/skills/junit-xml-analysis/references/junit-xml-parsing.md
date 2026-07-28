# JUnit XML: Node.js parser and CI wiring

Companion detail for `junit-xml-analysis`. The Python `parse_junit.py` in SKILL.md is the runnable core; this file holds the Node.js equivalent and the CI workflow.

## Node.js parser

```javascript
import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'node:fs';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const xml = parser.parse(readFileSync(path, 'utf8'));

const suites = xml.testsuites
  ? (Array.isArray(xml.testsuites.testsuite) ? xml.testsuites.testsuite : [xml.testsuites.testsuite])
  : [xml.testsuite];

for (const suite of suites) {
  const cases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
  // ...
}
```

Handle both root shapes (`<testsuites>` or a bare `<testsuite>`) and single-element collapsing (one testcase = bare object, multiple = array), which is common in JS XML libraries.

## CI integration

```yaml
# .github/workflows/test-analytics.yml
- name: Run tests (any framework, JUnit XML reporter enabled)
  run: npm test -- --reporters=default,jest-junit
  env:
    JEST_JUNIT_OUTPUT_FILE: junit.xml

- name: Analyze JUnit XML
  if: always()
  run: python scripts/parse_junit.py junit.xml > analytics.json

- name: Upload analytics
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: junit-analytics
    path: |
      junit.xml
      analytics.json
```

`if: always()` is critical - JUnit XML matters most on failed runs.
