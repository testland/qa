# One runner, everything on it - O. Bergstrom, admin lead - 2026-09-09

Three suites, three sets of habits, and only one of them is reliably green.

| Area           | Tool       | e2e job green, last 90 days |
|----------------|------------|-----------------------------|
| admin          | Cypress    | 99.6%                       |
| storefront     | Playwright | 91.2%                       |
| partner portal | Selenium   | 88.0%                       |

The number is the argument. Whatever we standardise on should be the setup that
produced it, config and all - our cypress.config.ts, our workflow, our
dashboard. There are 18 months left on the Cloud contract and the VP reads that
dashboard every Monday morning.

- Storefront: the specs port over. The locator API differs but the shape is the
  same. Two engineers, six weeks.
- Partner portal: the runner does not speak Python, so the five of them pick up
  TypeScript as they go. They only have eleven specs between them.
- Unit tests: component tests belong in the same runner as everything else.
  Moving apps/storefront/tests/unit off node --test removes the last separate
  command, and then one `npm run e2e` is the whole quality story.

I would start with the partner portal because it is the smallest.
