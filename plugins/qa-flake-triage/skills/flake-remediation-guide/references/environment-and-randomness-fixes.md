# Environment-variance and randomness flake fixes

Deep reference for `flake-remediation-guide` SKILL.md. The Pattern 7
(environment variance) and Pattern 8 (randomness) code fixes, split out
of the main guide so the four core-pattern fixes stay in front.

## Pattern 7 fix: environment variance

**Root cause:** path separators, line endings, timezones, or fonts
differ across OS / CI environments.

### Pin timezone

Set `TZ=UTC` in every CI job that contains time-sensitive assertions.
This eliminates the class of failures where `new Date().toISOString()`
produces a different date in UTC-8 vs. UTC+9.

```yaml
# .github/workflows/test.yml
env:
  TZ: UTC
```

### Use platform-neutral path APIs

```typescript
// Before - breaks on Windows CI
const fixture = path.join('tests', 'fixtures', 'data.json');

// After - works on Linux, macOS, and Windows
import { join } from 'node:path';
const fixture = join('tests', 'fixtures', 'data.json');
```

### Freeze the clock with Playwright's Clock API

When the test asserts a displayed date or a timer-driven behavior, use
`page.clock.install()` to stop the system clock at a fixed instant
([pw-clock][pw-clk]):

```typescript
// Install the fake clock before the page loads; freeze at a known UTC instant
await page.clock.install({ time: new Date('2026-01-15T12:00:00Z') });
await page.goto('/dashboard');

// "Last seen" label will always read "Jan 15, 2026" regardless of
// which machine or timezone the test runs on
await expect(page.getByTestId('last-seen')).toHaveText('Jan 15, 2026');
```

`page.clock.install()` overrides `Date`, `setTimeout`, `setInterval`,
`requestAnimationFrame`, and `performance` ([pw-clock][pw-clk]).

### Visual snapshots

For pixel-level snapshot tests, regenerate baselines only in CI (never
from a developer laptop). OS font rendering and anti-aliasing differ
between macOS and Linux - a baseline captured locally will produce
false positives on the CI runner. See `playwright-snapshots`
for the full update workflow.

## Pattern 8 fix: randomness

**Root cause:** tests generate random data without a controlled seed,
so the failing combination cannot be reproduced.

### Seed every random source

**Faker.js** - call `faker.seed(N)` before generating any test data.
The same integer seed produces the same data sequence on every run
([faker-api][faker]):

```typescript
import { faker } from '@faker-js/faker';

beforeEach(() => {
  faker.seed(12345);   // deterministic; any integer works
});

test('long product name does not overflow card', async ({ page }) => {
  const name = faker.commerce.productName();   // same value every run
  await page.goto(`/products/new`);
  await page.getByLabel('Name').fill(name);
  await expect(page.getByTestId('product-card')).toBeVisible();
});
```

**Math.random** - replace with a seeded PRNG such as
[`seedrandom`](https://github.com/davidbau/seedrandom):

```typescript
import seedrandom from 'seedrandom';

const rng = seedrandom('fixed-seed');
const id = Math.floor(rng() * 1_000_000);
```

**Vitest / Jest fake timers** - `vi.useFakeTimers({ seed: N })` or
`jest.useFakeTimers({ now: N })` seeds the internal PRNG as well as
the system clock.

### Persist the seed in CI artifacts

Log the seed used per run so a flake on CI can be replayed locally:

```typescript
const SEED = Number(process.env.TEST_SEED ?? Date.now());
console.log(`faker seed: ${SEED}`);   // visible in CI job log
faker.seed(SEED);
```

Pass `TEST_SEED=<failing-seed>` to reproduce the exact failure.

### Property-based test failures are not flakes

When a property-based test (fast-check, jqwik) fails, it has found a
real edge case. Copy the failing seed into a regression test and fix
the production bug.

[pw-clk]: https://playwright.dev/docs/clock
[faker]: https://fakerjs.dev/api/
