# qa-visual-regression

Visual regression testing across Percy, Chromatic, Playwright snapshots, Storybook visual tests, plus diff classification and baseline curation agents.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [percy-visual-regression-testing](skills/percy-visual-regression-testing/SKILL.md) | S1 | Author Percy snapshots via @percy/playwright/cypress/selenium/storybook; run with `percy exec`; review diffs in the Percy UI. |
| skill | [chromatic-visual-regression-testing](skills/chromatic-visual-regression-testing/SKILL.md) | S1 | Run Chromatic on Storybook / Playwright / Cypress; configure baselines, TurboSnap, exit codes for CI gating. |
| skill | [playwright-snapshots](skills/playwright-snapshots/SKILL.md) | S1 | Author `expect(page).toHaveScreenshot()` assertions; configure mask/clip/threshold/maxDiffPixels; manage per-OS / per-browser snapshot dirs and `--update-snapshots`. |
| skill | [storybook-visual-regression-testing](skills/storybook-visual-regression-testing/SKILL.md) | S1 | Wire visual regression into Storybook via @chromatic-com/storybook (hosted) or @storybook/test-runner postVisit + Playwright (self-hosted). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-visual-regression@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
