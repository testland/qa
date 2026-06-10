# QA leadership & test management

QA leadership & test-management role bundle: one-command install of the QA role org-chart, test process, test management, impact analysis, reporting, hiring, shift-left, defect management, and production-code quality governance.

Installing this one plugin installs all 9 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-leadership@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-roles** - QA org chart of 15 sharply-scoped role agents across four tiers. Tier 1 IC
- **qa-process** - Test process + methodology
- **qa-test-management** - Test case management discipline (pre-execution authoring + lifecycle +
- **qa-test-impact-analysis** - Test impact analysis (TIA) and regression-suite hygiene
- **qa-test-reporting** - Test reporting + coverage analytics
- **qa-hiring** - QA hiring toolkit
- **qa-shift-left** - Shift-left QA
- **qa-defect-management** - Defect management discipline (taxonomy, lifecycle, workflows)
- **qa-code-quality** - Production code quality

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
