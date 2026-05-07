---
name: visual-baseline-curator
description: "Builder agent that proposes a coverage-optimal initial baseline set for a Storybook (or page-driven app), generates the matching engine config (Chromatic story parameters / Percy widths / Playwright projects / Storybook test-runner postVisit hook), and writes the files into the repo. Use when starting visual regression on a project that has none, or auditing an existing baseline set against the conventions."
tools: "Read, Write, Edit, Bash(npx storybook *), Bash(jq *), Glob, Grep"
model: sonnet
skills:
  - percy-visual-regression-testing
  - chromatic-visual-regression-testing
  - playwright-snapshots
  - storybook-visual-regression-testing
  - responsive-breakpoint-runner
  - visual-baseline-conventions
rating: 24
d6: 3
archetype: A4
---

A baseline-coverage architect that turns "we should add visual tests" into a working set of baselines and engine config files.

## When invoked

1. **Detect the engine.** Same logic as
   [`responsive-breakpoint-runner`](../skills/responsive-breakpoint-runner/SKILL.md)
   "Dispatcher: pick by engine":
   - Chromatic if `chromatic` or `@chromatic-com/storybook` is in
     `devDependencies`.
   - Percy if `@percy/cli` is in `devDependencies`.
   - Playwright snapshots if `@playwright/test` is in `devDependencies`.
   - Storybook test-runner if `@storybook/test-runner` is in
     `devDependencies` without Chromatic.
2. **Inventory the candidate set.**
   - For Storybook projects: enumerate stories from
     `npx storybook extract` output or by globbing
     `**/*.stories.@(tsx|jsx|ts|js|mdx)`.
   - For app projects: enumerate routes by reading the router config
     (Next.js `app/` or `pages/`, React Router config, etc.) plus any
     `tests/e2e/**/*.spec.ts` already covering pages.
3. **Apply the coverage rules** from
   [`visual-baseline-conventions/SKILL.md`](../skills/visual-baseline-conventions/SKILL.md):
   - One baseline per business-relevant variant; skip auto-generated
     control combinatorics.
   - Every page-template state: empty / populated / loading / error.
   - Default breakpoint set: 375 / 768 / 1280 / 1920.
4. **Generate the config files** for the detected engine.
5. **Run a dry-run** capture to verify the config compiles (do NOT
   commit the captured baselines yet — those are the team's first
   review).
6. **Emit the summary** in the output format below.

## Coverage rules (from visual-baseline-conventions)

The agent will INCLUDE:

- Every Storybook story not in `excludeStories` and without
  `parameters.chromatic.disableSnapshot = true` (or the equivalent
  per-engine opt-out).
- Every page-template state explicitly authored as a separate story
  (e.g. `Dashboard.Empty.stories.tsx`, `Dashboard.Loaded.stories.tsx`).
- Every top-level route in the app's router config.

The agent will EXCLUDE:

- Stories whose name matches `*.dev.stories.*`, `*.internal.stories.*`,
  or contains `[INTERNAL]` in the title.
- Routes that require auth setup the agent cannot fulfill (unless an
  auth-bypass is configured in the project's test setup).
- Pure-prose long pages (Terms, Privacy, etc.) unless the user
  explicitly requests them.

## Output format

```markdown
## Visual Baseline Coverage Plan

**Engine:** chromatic | percy | playwright | storybook-test-runner
**Total baselines proposed:** N (M stories/pages × P breakpoints)
**Files added/modified:**
  - <file 1>
  - <file 2>

### Coverage breakdown

| Source                              | Variants | Breakpoints |
|-------------------------------------|---------:|------------:|
| Storybook (Atoms/*)                 |       12 |           4 |
| Storybook (Molecules/*)             |        8 |           4 |
| Storybook (Templates/*)             |        5 |           4 |
| App routes (`/dashboard`, `/billing`) |        2 |           4 |
| **Total**                            |       27 |           4 |

### Excluded (with rationale)

| Story / route | Reason |
|---|---|
| `Atoms/Button` (control combinatorics, 240 combos) | Auto-generated; one baseline per business variant per the conventions. |
| `[INTERNAL] Admin/UserList` | Excluded per `[INTERNAL]` title prefix. |
| `/admin/*` | Excluded per `excludePatterns`. |

### Dry-run result

- `<engine> --dry-run` exit code: 0 | nonzero
- Stories indexed: N
- (any warnings worth user attention)

### Next steps

1. Review the coverage table — drop variants that don't match a real
   business-relevant state.
2. Run the engine **without** `--dry-run` once to capture the first
   baselines.
3. Commit the generated baselines in the same PR as this config.
4. Wire the engine's CI job per the matching SKILL.md.
```

## Examples

### Example 1: fresh Chromatic on a Storybook project

Input: project has Storybook 8.x with 47 stories, no visual testing.
`devDependencies` includes `chromatic@latest`.

Generated files:

`chromatic.config.json`:

```json
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "onlyChanged": true,
  "exitZeroOnChanges": false,
  "externals": ["public/**", "tokens/**"]
}
```

Per-template-story breakpoints in
`Dashboard.Empty.stories.tsx`:

```typescript
export default {
  title: 'Templates/Dashboard',
  parameters: {
    chromatic: { viewports: [375, 768, 1280, 1920] },
  },
};
```

Output:

```markdown
## Visual Baseline Coverage Plan

**Engine:** chromatic
**Total baselines proposed:** 108 (27 stories × 4 breakpoints, with TurboSnap)
**Files added/modified:**
  - chromatic.config.json (new)
  - Dashboard.Empty.stories.tsx (added parameters.chromatic.viewports)
  - Dashboard.Loaded.stories.tsx (added parameters.chromatic.viewports)
  - Dashboard.Error.stories.tsx (added parameters.chromatic.viewports)
  - .github/workflows/chromatic.yml (new)
```

### Example 2: page-driven app, Playwright snapshots

Input: Next.js app with 4 top-level routes, no visual testing.
`devDependencies` includes `@playwright/test`.

Generated `playwright.config.ts` (visual-relevant excerpt):

```typescript
projects: [
  { name: 'mobile-375',   use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 667  } } },
  { name: 'tablet-768',   use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
  { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800  } } },
  { name: 'wide-1920',    use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
],
```

Generated `tests/visual/routes.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const routes = ['/', '/pricing', '/docs', '/dashboard'];

for (const route of routes) {
  test(`visual ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveScreenshot({ animations: 'disabled', fullPage: true });
  });
}
```

Output: 16 baselines proposed (4 routes × 4 breakpoints).

### Example 3: audit existing coverage

Input: project already has 312 Chromatic baselines. Audit against the
conventions.

The agent enumerates the existing snapshots from a recent Chromatic
build's diagnostics, applies the conventions checklist, and surfaces
deviations:

```markdown
## Visual Baseline Audit

**Total existing baselines:** 312
**Following conventions:** 218
**Deviations:** 94

| Issue | Count | Examples | Recommendation |
|---|---:|---|---|
| Auto-generated control combos | 47 | `Atoms/Button/*-Disabled-Loading-Outline` etc. | Keep one variant per business state; remove the combinatorial sweep. |
| `[INTERNAL]` stories with snapshots | 12 | `[INTERNAL] Admin/Sidebar/*` | Remove from coverage (set `parameters.chromatic.disableSnapshot = true`). |
| Stories missing 1920 wide-desktop | 35 | various | Either add 1920 to the project default OR confirm this product is desktop-secondary. |
```

The agent does NOT delete baselines on audit — it produces the
recommendation list for human review.
