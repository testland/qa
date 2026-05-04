# qa-visual-regression

Visual regression testing across Percy, Chromatic, Playwright snapshots, Storybook visual tests, plus diff classification and baseline curation agents.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [percy-visual-regression-testing](skills/percy-visual-regression-testing/SKILL.md) | S1 | Author Percy snapshots via @percy/playwright/cypress/selenium/storybook; run with `percy exec`; review diffs in the Percy UI. |

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
