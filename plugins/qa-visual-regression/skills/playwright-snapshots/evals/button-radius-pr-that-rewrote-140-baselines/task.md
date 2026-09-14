# Reviewing a one-line CSS change that arrived with 140 committed PNGs

## Problem Description

I am the reviewer on PR #5311 and I have about forty minutes before the release
train. The change itself is one property in one file - our button corner radius
goes from 4px to 8px, signed off by design in FIG-882 on 2026-09-07. The PR also
carries 140 baseline PNG files that the update job produced.

Ana, who runs the web guild, has already told me in Slack to take the whole
thing as a block: "it's one token, the diffs are corners, we are not spending a
reviewer afternoon on 140 images." Dan says the same on the PR. I am inclined to
agree with both of them and click approve, and if that is the right call I want
to be told so plainly rather than handed a list of homework.

What I have instead of the images is the list of changed files with their git
status, the JSON our reporter writes (per-file pixel counts and the bounding box
of the changed region, which is why we started emitting it), the state of the
`main` tree for the same directories, the open-bug board, and the workflow that
generated the commit. That is what I want you to reason from.

Give me a per-group verdict with the evidence for each. If any of it should not
go in on this branch, tell me exactly what Dan has to run to put back only the
parts that do belong, and be specific about the command - last time someone
"just re-ran the job" here we ended up in a worse place than we started.

## Output Specification

1. Write `docs/visual-review-5311.md`: a verdict for every group of baseline
   files in the change, the evidence behind each verdict, ordered so the thing
   that matters most is first.
2. Give Dan the exact command or commands to run, and say what he should take
   off the branch.
3. Say what has to change so the next token-sized PR does not arrive like this.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pr-5311.md ===============
# PR #5311 - "chore(tokens): button radius 4px -> 8px"

Author: @dweir. Opened 2026-09-09. Reviewer: me.

Description as written by the author:

> Design sign-off in FIG-882. One token. Ran the update job on the branch from
> the Actions tab with the default inputs, all the diffs are just corners,
> please don't make me open 140 images.

Commits on the branch:

```
a41c7e2  chore(tokens): button radius 4px -> 8px
9db3f10  test: rename three report specs for clarity
33c81ab  chore: baselines after radius change
```

`9db3f10` in full:

```
 tests/legacy-reports.spec.ts
-test('report exports', async ({ page }) => {
-test('report filters', async ({ page }) => {
-test('report schedule', async ({ page }) => {
+test('report exports correctly', async ({ page }) => {
+test('report filters correctly', async ({ page }) => {
+test('report schedules correctly', async ({ page }) => {
```

Source files changed in the whole PR: `src/tokens.css` only.

## Thread

**@dweir**, 2026-09-09: the checkout numbers in the report look big but the
order-summary panel has rounded corners of its own and an "Apply" control in it
for the promo field, so that block was always going to move more than a nav bar
would. Same change, bigger surface.

**@atran** (guild lead), 2026-09-09: the rename commit is cosmetic. Renaming a
test renames its PNG, the update job just moves the file across on disk, the
bytes are the same bytes. Don't hold a release train over a file move.

**@atran**, 2026-09-10: take it as a block. One token, one designer sign-off.

=============== FILE: src/tokens.css ===============
:root {
  --color-accent: #3b5bdb;
  --color-surface: #ffffff;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --radius-button: 8px;   /* was 4px - FIG-882 */
  --radius-card: 12px;
  --font-body: 'Inter', system-ui, sans-serif;
}

=============== FILE: reports/baseline-changes.md ===============
# `git diff --name-status main...HEAD -- '*.png'` on PR #5311

140 files. Grouped by directory and status.

## Group A - 96 files, status M

```
M  tests/home.spec.ts-snapshots/home-hero-1-chromium-linux.png
M  tests/home.spec.ts-snapshots/home-cta-1-chromium-linux.png
M  tests/nav.spec.ts-snapshots/nav-primary-1-chromium-linux.png
... 93 more across home / nav / search / onboarding / docs specs
```

## Group B - 11 files, status M

```
M  tests/checkout.spec.ts-snapshots/checkout-summary-1-chromium-linux.png
M  tests/checkout.spec.ts-snapshots/checkout-address-1-chromium-linux.png
M  tests/checkout.spec.ts-snapshots/checkout-payment-1-chromium-linux.png
... 8 more, all under tests/checkout.spec.ts-snapshots/
```

## Group C - 18 files, status A

```
A  tests/settings.spec.ts-snapshots/settings-profile-1-chromium-linux.png
A  tests/settings.spec.ts-snapshots/settings-billing-1-chromium-linux.png
A  tests/settings.spec.ts-snapshots/settings-team-1-chromium-linux.png
... 15 more, all under tests/settings.spec.ts-snapshots/
```

## Group D - 15 files, status A

```
A  tests/legacy-reports.spec.ts-snapshots/report-exports-correctly-1-chromium-linux.png
A  tests/legacy-reports.spec.ts-snapshots/report-filters-correctly-1-chromium-linux.png
A  tests/legacy-reports.spec.ts-snapshots/report-schedules-correctly-1-chromium-linux.png
... 12 more, all under tests/legacy-reports.spec.ts-snapshots/
```

No PNG under any of these directories has status `D` in this diff.

=============== FILE: docs/main-tree.md ===============
# `git ls-files 'tests/**/*.png'` on `main` at merge-base 7c0ea19, by directory

| Directory                                | PNGs on main |
|------------------------------------------|--------------|
| tests/home.spec.ts-snapshots/            | 34           |
| tests/nav.spec.ts-snapshots/             | 12           |
| tests/search.spec.ts-snapshots/          | 21           |
| tests/onboarding.spec.ts-snapshots/      | 18           |
| tests/docs.spec.ts-snapshots/            | 11           |
| tests/checkout.spec.ts-snapshots/        | 11           |
| tests/legacy-reports.spec.ts-snapshots/  | 15           |
| tests/settings.spec.ts-snapshots/        | 0            |

The 15 PNGs on `main` under `tests/legacy-reports.spec.ts-snapshots/` are
`report-exports-1-chromium-linux.png`, `report-filters-1-chromium-linux.png`,
`report-schedule-1-chromium-linux.png` and twelve siblings. All 15 are byte
identical between `main` and the head of this branch.

=============== FILE: reports/diff-summary.json ===============
{
  "run": 9104,
  "branch": "dw/button-radius",
  "producedBy": "visual-update workflow_dispatch 2026-09-09T11:40:12Z",
  "fields": {
    "baselineSha": "blob sha of the file this run compared against, or null",
    "diffPixels": "differing pixel count, or null",
    "box": "bounding box of the differing region, or null"
  },
  "groupStats": {
    "A": { "files": 96, "diffPixelsMin": 88, "diffPixelsMax": 421, "diffPixelsMedian": 164,
           "boxes": "14-22px tall, none wider than 180px", "baselineShaPresent": 96 },
    "B": { "files": 11, "diffPixelsMin": 24106, "diffPixelsMax": 31533, "diffPixelsMedian": 27880,
           "boxes": "380-560px tall, 300-340px wide, all at x 872-884", "baselineShaPresent": 11 },
    "C": { "files": 18, "diffPixelsMin": null, "diffPixelsMax": null, "diffPixelsMedian": null,
           "boxes": null, "baselineShaPresent": 0 },
    "D": { "files": 15, "diffPixelsMin": null, "diffPixelsMax": null, "diffPixelsMedian": null,
           "boxes": null, "baselineShaPresent": 0 }
  },
  "samples": [
    { "group": "A", "file": "home-hero-1-chromium-linux.png", "baselineSha": "b31f0a2", "diffPixels": 152, "box": { "x": 604, "y": 418, "width": 168, "height": 18 } },
    { "group": "A", "file": "nav-primary-1-chromium-linux.png", "baselineSha": "5c19dd8", "diffPixels": 96, "box": { "x": 1020, "y": 22, "width": 112, "height": 16 } },
    { "group": "B", "file": "checkout-summary-1-chromium-linux.png", "baselineSha": "a7742e1", "diffPixels": 29844, "box": { "x": 880, "y": 96, "width": 332, "height": 512 } },
    { "group": "B", "file": "checkout-payment-1-chromium-linux.png", "baselineSha": "0fe3ab5", "diffPixels": 31533, "box": { "x": 880, "y": 96, "width": 318, "height": 546 } },
    { "group": "C", "file": "settings-billing-1-chromium-linux.png", "baselineSha": null, "diffPixels": null, "box": null },
    { "group": "D", "file": "report-exports-correctly-1-chromium-linux.png", "baselineSha": null, "diffPixels": null, "box": null }
  ]
}

=============== FILE: docs/checkout-layout.md ===============
# Checkout page regions (from the design file, 1440 x 900 desktop)

| Region              | x range     | Contains                                                      |
|---------------------|-------------|---------------------------------------------------------------|
| Step rail           | 0 - 240     | step numbers, no controls                                     |
| Form column         | 240 - 856   | address / payment inputs, the primary "Continue" button       |
| Order summary panel | 872 - 1216  | line-item table, subtotal, tax, total, promo-code text field  |
| Gutter              | 1216 - 1440 | empty                                                         |

Note from @jsalas on the design file, 2026-08-30: the promo-code field on the
summary panel is a text input with an inline submit styled as a link, so nothing
in the summary panel consumes `--radius-button`. The panel's own corners use
`--radius-card`. The "Continue" button is in the form column.

=============== FILE: docs/ci-main.log ===============
# visual job on main, trimmed - last four runs before this PR branched

Run 9081 (2026-09-08)
  18 failed, 0 flaky, 212 passed
  1) [chromium] settings.spec.ts:8:1 > settings profile ---------------------
     Error: A snapshot doesn't exist at
       tests/settings.spec.ts-snapshots/settings-profile-1-chromium-linux.png,
       writing actual.
  ... same shape for 17 more settings checks ...

Run 9074 (2026-09-05): identical 18 settings errors.
Run 9068 (2026-09-03): identical 18 settings errors.
Run 9061 (2026-09-01): identical 18 settings errors.

`tests/settings.spec.ts` was added 2026-08-19 in PR #5244. The 18 errors above
have appeared on every run on main since that date.

=============== FILE: docs/bug-board.md ===============
# Open bugs, web, as of 2026-09-09

| ID       | Opened     | Area       | Title                                                                   | State |
|----------|------------|------------|-------------------------------------------------------------------------|-------|
| BUG-4402 | 2026-07-30 | search     | Recent-searches dropdown keeps focus after Escape                       | open  |
| BUG-4418 | 2026-08-03 | nav        | Primary nav wraps to two lines at exactly 1024px                        | open  |
| BUG-4427 | 2026-08-09 | onboarding | Step 3 "Skip" link is not keyboard reachable                            | open  |
| BUG-4440 | 2026-08-14 | docs       | Code blocks lose syntax colours after theme toggle                      | open  |
| BUG-4455 | 2026-08-21 | checkout   | Promo code accepted twice if submitted quickly                          | open  |
| BUG-4471 | 2026-08-28 | account    | Billing tab renders an empty card plus a console error when the account has no payment method on file; reproduces on every seeded CI account | open |
| BUG-4480 | 2026-09-01 | home       | Hero video autoplays on metered connections                             | open  |
| BUG-4488 | 2026-09-03 | search     | Filter chips overflow on narrow viewports                               | open  |
| BUG-4495 | 2026-09-04 | account    | Team invite email uses the old logo                                     | open  |
| BUG-4501 | 2026-09-07 | docs       | Anchor links jump 64px past the heading                                 | open  |

Seed accounts used by CI (`docs/ci-seeds.md`, unchanged since June): the
`settings` spec and the `account` spec both run against `seed-acct-03`, which
has no payment method attached, by design.

=============== FILE: .github/workflows/visual-update.yml ===============
name: visual-update

on:
  workflow_dispatch:
    inputs:
      spec:
        description: 'Spec file or grep pattern to limit the update to'
        required: false
        default: ''

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.head_ref }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Install browsers
        run: npx playwright install --with-deps

      - name: Regenerate baselines
        run: npx playwright test --update-snapshots

      - name: Commit
        run: |
          git config user.name "visual-bot"
          git config user.email "visual-bot@example.com"
          git add -A '*.png'
          git commit -m "chore: baselines after radius change" || echo "nothing to commit"
          git push
