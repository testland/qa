# Manual Tester / QA Analyst (role bundle)

Manual tester / QA analyst role bundle: one-command install of manual scripted + exploratory testing, test case management, defect management, bug reproduction, test reporting, test process, and test data.

Unlike the tech-domain bundles (`qa-role-frontend`, `qa-role-backend`), this bundle is organized around the **job role**: it covers a manual tester's whole week - design test cases, run exploratory sessions, execute scripted runs, file and verify bugs, sync results to your test case management tool - regardless of which technology stack the product is built on.

Installing this one plugin installs all 7 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-manual-tester@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-manual-testing** - Manual scripted + exploratory testing (SBTM charters, heuristics, tours, UAT scripts, bug bashes)
- **qa-test-management** - Test case repository management (TestRail, Xray, Zephyr Scale, Allure TestOps, Qase) + traceability
- **qa-defect-management** - Defect lifecycle, severity/priority, taxonomy, tracker workflows (Jira, Linear, GitHub, Azure DevOps)
- **qa-bug-repro** - Bug report authoring, reproduction, failure classification
- **qa-test-reporting** - Run summaries + posting results back to your TCM
- **qa-process** - Test design ideation, risk-based testing, smoke suites, Definition of Done
- **qa-test-data** - Test data generation and preparation

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
