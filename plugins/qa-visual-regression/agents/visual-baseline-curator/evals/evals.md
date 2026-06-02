---
component: visual-baseline-curator
type: agent
archetype: A4
---

# visual-baseline-curator - evals

Companion eval cases for [`visual-baseline-curator`](../../visual-baseline-curator.md).
Three cases cover happy path / branch / adversarial: a Chromatic +
Storybook coverage plan (the agent's Example 1), a Playwright-snapshots
page-driven branch (Example 2), and a no-engine refusal. Re-run by
feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - fresh Chromatic on a Storybook project

**Input:**

```
Generate the initial visual baseline coverage plan for our Storybook
project. We want to start visual regression from scratch — no
baselines exist yet.

package.json devDependencies (excerpt):
  "@chromatic-com/storybook": "^3.2.0"
  "chromatic": "^11.20.0"
  "@storybook/react": "^8.4.0"

Storybook story inventory (already counted): 47 stories.
  - Atoms/*       12 stories
  - Molecules/*    8 stories
  - Organisms/*   10 stories
  - Templates/*    5 stories
  - Pages/*        4 stories (Dashboard.Empty, Dashboard.Loaded,
                              Billing.Empty, Billing.Loaded)
  - [INTERNAL] Admin/UserList — 1 story (should be excluded)
  - Atoms/Button has 240 control-combinatorics stories (should be
    excluded — only one business variant per state per the conventions)
  - 7 additional stories across the tree

Target build runs on staging; CI is GitHub Actions.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 detects Chromatic from
`@chromatic-com/storybook` + `chromatic` in `devDependencies`.
Step 2 inventories the candidate set - 47 stories. Step 3 applies the
coverage rules from `visual-baseline-conventions`: includes Atoms /
Molecules / Organisms / Templates / Pages business variants; excludes
the 240 Button control combinatorics, excludes `[INTERNAL]
Admin/UserList`. Step 4 generates `chromatic.config.json` (with
`onlyChanged: true`, `exitZeroOnChanges: false`, `externals`),
`parameters.chromatic.viewports: [375, 768, 1280, 1920]` for template
stories, and `.github/workflows/chromatic.yml`. Step 5 runs a dry-run
to verify config compiles. Step 6 emits the summary table with
`Total baselines proposed` ≈ 27 × 4 = 108 (per the agent's Example 1).
The "Excluded" table cites `[INTERNAL]` and the Button combinatorics
with rationale from the conventions skill.

**Pass condition:** Output contains the literal string `Chromatic` AND
`chromatic.config.json` AND `375` (a default breakpoint) AND `1920`
(the wide-desktop breakpoint). Output contains the heading
`### Excluded (with rationale)` (or equivalent) AND mentions
`[INTERNAL]` AND `Atoms/Button` (or `control combinatorics`). Output
does NOT contain `Percy` config / `playwright.config.ts` (other-engine
branches - would indicate wrong-branch failure).

## Eval 2 - branch - page-driven Next.js app with Playwright snapshots

**Input:**

```
Generate the initial visual baseline coverage plan. We use Next.js
13 App Router — page-driven, no Storybook.

package.json devDependencies (excerpt):
  "@playwright/test": "^1.49.0"
  "next": "^13.5.0"

Router config (Next.js app/ directory):
  app/page.tsx               (route: `/`)
  app/dashboard/page.tsx     (route: `/dashboard`)
  app/billing/page.tsx       (route: `/billing`)
  app/settings/page.tsx      (route: `/settings`)
  app/admin/users/page.tsx   (route: `/admin/users` — requires auth
                              setup the agent cannot fulfill, no
                              auth-bypass configured)

No existing visual-test config. Target staging URL: https://staging.acme.local.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Step 1 detects Playwright snapshots from `@playwright/test`
in `devDependencies`, no Chromatic / Percy packages present.
Step 2 inventories the router config - enumerates 4 top-level routes;
excludes `/admin/users` per the conventions ("Routes that require auth
setup the agent cannot fulfill"). Step 4 generates a
`playwright.config.ts` with one project per breakpoint
(375 / 768 / 1280 / 1920) and a `tests/visual/routes.spec.ts` that
iterates routes calling `page.goto(route)` +
`expect(page).toHaveScreenshot({ animations: 'disabled', fullPage:
true })`. Total baselines ≈ 4 routes × 4 breakpoints = 16 (per the
agent's Example 2). The "Excluded" table mentions
`/admin/users` with the "requires auth setup" rationale.

**Pass condition:** Output contains the literal string
`playwright.config.ts` AND `toHaveScreenshot` AND `375` AND `1920`.
Output mentions `/admin/users` AND `auth` (the excluded-route
rationale). Output does NOT contain `chromatic.config.json` /
`@percy/cli` (other-engine branches - would indicate wrong-branch
failure).

## Eval 3 - adversarial - no visual-test engine present (refuse)

**Input:**

```
Generate the initial visual baseline coverage plan for our project.

package.json devDependencies (excerpt):
  "jest": "^29.7.0"
  "react": "^18.2.0"
  "vite": "^5.0.0"

(No Chromatic, no @percy/cli, no @playwright/test, no
@storybook/test-runner. No visual-regression engine of any kind is
installed.)

Project: a Vite + React SPA with hand-written routes. No Storybook.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to scaffold baselines. The agent's "When invoked"
Step 1 is "Detect the engine" - Chromatic / Percy / Playwright /
Storybook test-runner. None of the four packages is present in
`devDependencies`. The agent does NOT silently install an engine, does
NOT pick one at random, does NOT generate `chromatic.config.json` or
`playwright.config.ts` against an unconfigured project. It explains
the prerequisite (one of the four engines installed) and recommends
the user pick one based on stack (Storybook → Chromatic / Storybook
test-runner; page-driven → Playwright; cross-browser hosted → Percy).
The agent points at the per-engine SKILL.md files for the install
step.

**Pass condition:** Output asks the user to install / pick a visual-
regression engine (contains `Chromatic` OR `Percy` OR `Playwright`
framed as a choice, not as a generated config). Output does NOT
contain a written `chromatic.config.json` / `percy.config.js` /
`playwright.config.ts` file body. Output does NOT contain
`Total baselines proposed` followed by a non-zero count (the agent
must not pretend to have produced a plan).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (`package.json`
  excerpts + story inventory / router config) - no external fixtures,
  no need to clone a sample repo. The story counts in eval 1 mirror
  the agent's own Example 1.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Edit`,
  `Bash(npx storybook *)`, `Bash(jq *)`, `Glob`, `Grep`) writes
  config files - eval 3 is observable as the absence of any written
  config file plus the explicit engine-pick request.
- Eval cases were authored 2026-05-26 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
