# Currents CI wiring and the Cypress integration

Deep reference for the currents-integration SKILL.md. Consult when wiring
Currents into GitHub Actions, coordinating per-PR vs main baselines, or
setting up the Cypress sister integration.

## CI integration

```yaml
# .github/workflows/e2e.yml
name: e2e
on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests with Currents
        env:
          CURRENTS_RECORD_KEY: ${{ secrets.CURRENTS_RECORD_KEY }}
        run: npx pwc

      - name: Upload Playwright HTML report (fallback)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`if: always()` on the artifact upload preserves the local report even when
the Currents stream succeeds - useful when the dashboard is unreachable.

## Per-PR vs main runs

The Currents dashboard separates main runs (baseline) from PR runs
(comparison). For the analytics to make sense:

- **Main**: every push to main records a run. This becomes the baseline for
  trend graphs.
- **PR**: every PR push records a run; the dashboard cross-references by test
  name to identify "this PR introduced the flake on `cart.spec.ts:42`".

Set the CI workflow's branch + PR triggers (the CI integration example above)
to record both.

## Cypress shape (sister integration, same pattern)

The Cypress integration follows the same shape with `@currents/cypress`
instead of `@currents/playwright`:

```bash
npm i -D @currents/cypress
```

Then in `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';
import { currentsConfig } from '@currents/cypress';

export default defineConfig({
  ...currentsConfig({
    recordKey: process.env.CURRENTS_RECORD_KEY!,
    projectId: 'your-project-id',
  }),
});
```

Run via `npx cypress-cloud run` (the Cypress equivalent of `pwc`).
