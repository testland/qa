# Performance & reliability QA

Performance & reliability QA role bundle: one-command install of load testing, chaos engineering, resilience drills, and shift-left / shift-right production QA.

Installing this one plugin installs all 5 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-performance@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-load-testing** - Load and performance testing
- **qa-chaos** - Chaos engineering + fault injection
- **qa-resilience-drills** - Resilience drills
- **qa-shift-right** - Production-side QA per ISTQB-canonical shift-right ('a test approach to test a
- **qa-shift-left** - Shift-left QA

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
