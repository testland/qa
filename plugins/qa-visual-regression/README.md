# qa-visual-regression

Visual regression testing across Percy, Chromatic, Playwright snapshots, Storybook visual tests, plus diff classification and baseline curation agents.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [percy-visual-regression-testing](skills/percy-visual-regression-testing/SKILL.md) | S1 | Author Percy snapshots via @percy/playwright/cypress/selenium/storybook; run with `percy exec`; review diffs in the Percy UI. |
| skill | [chromatic-visual-regression-testing](skills/chromatic-visual-regression-testing/SKILL.md) | S1 | Run Chromatic on Storybook / Playwright / Cypress; configure baselines, TurboSnap, exit codes for CI gating. |
| skill | [playwright-snapshots](skills/playwright-snapshots/SKILL.md) | S1 | Author `expect(page).toHaveScreenshot()` assertions; configure mask/clip/threshold/maxDiffPixels; manage per-OS / per-browser snapshot dirs and `--update-snapshots`. |
| skill | [storybook-visual-regression-testing](skills/storybook-visual-regression-testing/SKILL.md) | S1 | Wire visual regression into Storybook via @chromatic-com/storybook (hosted) or @storybook/test-runner postVisit + Playwright (self-hosted). |
| skill | [responsive-breakpoint-runner](skills/responsive-breakpoint-runner/SKILL.md) | S4 | Dispatcher across viewport matrices for whichever engine the project uses; produces a single cross-breakpoint matrix report. |
| skill | [visual-baseline-conventions](skills/visual-baseline-conventions/SKILL.md) | S2 | Reference catalog: engine selection, story/page/breakpoint coverage, mask/threshold/wait decision matrix, severity tiering, anti-patterns. |
| agent | [visual-diff-classifier](agents/visual-diff-classifier.md) | A3 | Adversarial reviewer of visual diffs: classify each as intentional / incidental / regression; surfaces "looks intentional but isn't" cases that humans rubber-stamp. |
| agent | [visual-baseline-curator](agents/visual-baseline-curator.md) | A4 | Builder: proposes a coverage-optimal initial baseline set, generates engine config files, runs a dry-run to verify the suite compiles. |
| skill | [visual-baseline-gate](skills/visual-baseline-gate/SKILL.md) | S3 | CI gate: aggregate diff classifications + acceptance log into a single go/no-go verdict; enforce author-cannot-self-approve on baseline updates. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-visual-regression@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
