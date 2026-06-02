---
name: web-vitals-inp-deep
description: "Deep INP (Interaction to Next Paint) testing - break the metric into input delay, processing duration, and presentation delay; identify long tasks blocking the main thread; assert per-interaction INP budgets in CI via the `web-vitals` library and Playwright traces. INP became the Core Web Vital for responsiveness in 2024."
type: skill
archetype: S1
rating: 23
d6: 4
keywords:
  - web-vitals
  - inp
  - core-web-vitals
  - responsiveness
  - performance
---

# web-vitals-inp-deep

INP is *"the time from the start of the interaction to the moment the
next frame is fully presented"* per the [INP web.dev article].
Thresholds at the 75th percentile of page loads:

- **Good:** ≤ 200 ms
- **Needs Improvement:** 201 - 500 ms
- **Poor:** > 500 ms

## When to use

- A page reports "feels slow" but LCP and CLS are green - INP is
  the missing dimension.
- Pre-merge gate: assert key user interactions (form submit, modal
  open, route transition) stay under budget.
- Field debugging: correlate field INP outliers with specific
  interaction types.

## Step 1 - Install the web-vitals library

```bash
npm install web-vitals
```

Per the [INP web.dev article].

## Step 2 - Measure INP in lab (per interaction)

```ts
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value, metric);
  // metric.attribution gives interaction details (target, eventType, etc.)
});
```

Per the [INP web.dev article]: the `web-vitals` library handles
edge cases (BFCache restoration, visibility changes) that raw
`PerformanceObserver` does not.

## Step 3 - Decompose INP

INP encompasses three components per the [INP web.dev article]:

1. **Input Delay** - time before event handlers begin (often long
   tasks blocking main thread)
2. **Processing Duration** - time for all event handler callbacks
   to run
3. **Presentation Delay** - time until browser paints the next frame

Use `metric.attribution` (provided by web-vitals INP attribution
build) to identify which component dominates:

```ts
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  console.log('Total INP:', metric.value);
  console.log('Input delay:', metric.attribution.inputDelay);
  console.log('Processing duration:', metric.attribution.processingDuration);
  console.log('Presentation delay:', metric.attribution.presentationDelay);
  console.log('Long animation frame:', metric.attribution.longAnimationFrameEntries);
});
```

## Step 4 - Playwright assertion per interaction

```ts
import { test, expect } from '@playwright/test';

test('modal open INP under 200ms', async ({ page }) => {
  await page.addInitScript({ path: 'node_modules/web-vitals/dist/web-vitals.iife.js' });
  await page.goto('https://localhost:3000');

  await page.evaluate(() => {
    (window as any).__inpValues = [];
    (window as any).webVitals.onINP((m: any) => {
      (window as any).__inpValues.push(m.value);
    });
  });

  // The interaction under test
  await page.click('[data-testid="open-modal"]');
  await page.waitForSelector('[role="dialog"]');

  // Force INP to flush (web-vitals reports on hidden/pagehide)
  await page.evaluate(() => document.visibilityState);
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
  });

  const inps = await page.evaluate(() => (window as any).__inpValues);
  const max = Math.max(...inps);
  expect(max).toBeLessThan(200);
});
```

## Step 5 - Identify long tasks blocking main thread

```ts
test('no long tasks > 50ms during route change', async ({ page }) => {
  await page.goto('https://localhost:3000');

  const longTasks = await page.evaluate(() => {
    return new Promise<any[]>((resolve) => {
      const seen: any[] = [];
      const obs = new PerformanceObserver((list) => {
        seen.push(...list.getEntries().map((e) => ({
          name: e.name, duration: e.duration, startTime: e.startTime
        })));
      });
      obs.observe({ type: 'longtask', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(seen); }, 3000);
    });
  });

  await page.click('[data-testid="route-link"]');

  const blocking = (await page.evaluate(() => (window as any).__longTasks ?? []))
    .filter((t: any) => t.duration > 50);
  expect(blocking).toEqual([]);
});
```

## Step 6 - CrUX field data correlation

Lab + field don't always match. Pair lab tests with CrUX queries:

```bash
# CrUX REST API
curl -X POST 'https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=<API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://yoursite.com/","metrics":["interaction_to_next_paint"]}'
```

Field 75th percentile INP ≤ 200 ms = "Good" per the [INP web.dev
article]. Lab passing + field failing = sample population mismatch
(real devices slower, real interactions less predictable).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use raw `PerformanceObserver` for INP | Misses BFCache, visibility-change reporting | Use `web-vitals` library (Step 2) |
| Test INP only on `click` events | INP measures all interactions; tap, keypress also count | Test representative interactions per type |
| Use desktop CPU 4× speed | Hides regressions; field is mobile + slower CPU | Throttle CPU 4 - 6× in Playwright config |
| Assert single sample | INP is jittery; one bad sample fails CI | Run interaction N times; assert P75 ≤ budget |
| Fix INP by fragmenting handlers with `setTimeout(0)` | Hides yield, doesn't reduce work | Actually reduce processing duration via deferral patterns |

## Limitations

- INP became the official Core Web Vital in March 2024 (replacing
  FID). Some older audit tools still report FID - verify the tool
  uses INP.
- Service worker interception adds presentation-delay variance
  (cache miss vs hit). Pin to a known cache state in tests.
- `attribution` API requires the `web-vitals/attribution` build
  bundle, not the default.

## References

- [INP web.dev article] - definition, thresholds, decomposition,
  measurement via `web-vitals` library

[INP web.dev article]: https://web.dev/articles/inp
