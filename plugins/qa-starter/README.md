# QA Starter (essentials)

QA essentials role bundle: one-command install of the cross-cutting plugins every tester needs regardless of stack - test process, test data, environments, test-code review, reporting, flake triage, bug repro, defect management, CI integration, and manual/exploratory testing. Start here.

Installing this one plugin installs all 10 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-starter@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-process** - Test process + methodology
- **qa-test-data** - Test data engineering
- **qa-test-environment** - Test environment management
- **qa-test-review** - Test code quality reviewers for test files only — closes the gap surfaced in
- **qa-test-reporting** - Test reporting + coverage analytics
- **qa-flake-triage** - Flake triage
- **qa-bug-repro** - Bug reproduction workflow
- **qa-defect-management** - Defect management discipline (taxonomy, lifecycle, workflows)
- **qa-ci-integration** - CI/CD test workflow patterns
- **qa-manual-testing** - Manual scripted + exploratory testing

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
