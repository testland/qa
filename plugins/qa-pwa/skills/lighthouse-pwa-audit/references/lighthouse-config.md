# Lighthouse CI config and programmatic invocation

Companion detail for `lighthouse-pwa-audit`. The inline CLI run (Step 3) is
enough to produce an LHR; use these when gating CI or invoking Lighthouse from
a test runner.

## Lighthouse CI config (`.lighthouserc.json`)

Full config for all nine still-supported audits:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 3,
      "settings": {
        "onlyAudits": [
          "installable-manifest",
          "service-worker",
          "maskable-icon",
          "viewport",
          "themed-omnibox",
          "splash-screen",
          "content-width",
          "apple-touch-icon",
          "is-on-https"
        ],
        "throttlingMethod": "devtools"
      }
    },
    "assert": {
      "assertions": {
        "installable-manifest": ["error", { "minScore": 1 }],
        "service-worker": ["error", { "minScore": 1 }],
        "maskable-icon": ["error", { "minScore": 1 }],
        "viewport": ["error", { "minScore": 1 }],
        "is-on-https": ["error", { "minScore": 1 }],
        "themed-omnibox": ["warn", { "minScore": 1 }],
        "splash-screen": ["warn", { "minScore": 1 }],
        "content-width": ["warn", { "minScore": 1 }],
        "apple-touch-icon": ["warn", { "minScore": 1 }]
      },
      "aggregationMethod": "median-run"
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Per lhci-config, each assertion is
`"<audit-id-or-categories:<id>>": [severity, { minScore | maxNumericValue | ... }]`
with `severity` one of `off`, `warn`, `error`. `error` fails the build; `warn`
surfaces a warning without failing. `aggregationMethod` supports `median`,
`optimistic`, `pessimistic`, `median-run`; `median-run` "represents the most
typical run" and suits noisy mobile PWA audits.

## Programmatic invocation from Node.js (full Vitest spec)

```ts
// tests/lighthouse-pwa.spec.ts
import { test, expect } from 'vitest';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

test('PWA audits pass on the build', async () => {
  const chrome = await launch({ chromeFlags: ['--headless'] });
  try {
    const { lhr } = await lighthouse(
      'http://localhost:3000/',
      {
        port: chrome.port,
        output: 'json',
        onlyAudits: [
          'installable-manifest',
          'service-worker',
          'maskable-icon',
          'viewport',
          'is-on-https',
        ],
        formFactor: 'mobile',
        throttlingMethod: 'devtools',
      } as any
    );

    for (const id of [
      'installable-manifest',
      'service-worker',
      'maskable-icon',
      'viewport',
      'is-on-https',
    ]) {
      expect(lhr.audits[id].score).toBe(1);
    }
  } finally {
    await chrome.kill();
  }
});
```

The `lighthouse` npm export returns a Promise resolving to
`{ lhr, report, artifacts }`. The LHR is the parsed JSON; `report` is the
rendered HTML (when requested).

## Lighthouse CI in GitHub Actions

The `lhci autorun` umbrella command sequences collect -> assert -> upload:

```yaml
name: CI
on: [push]
jobs:
  lighthouseci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install && npm install -g @lhci/cli@0.15.x
      - run: npm run build
      - run: lhci autorun
```

Source references:

- lh-gh: https://github.com/GoogleChrome/lighthouse
- lhci-gh: https://github.com/GoogleChrome/lighthouse-ci
- lhci-config: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
