---
name: sfdpot-heuristic
description: "Pure-reference catalog of James Bach's SFDPOT heuristic - 'San Francisco Depot' - a 'you are here' framework that catalogues what a tester can vary in a system to find bugs. Six dimensions: Structure, Function, Data, Platform, Operations, Time. Use as a what-to-vary checklist during an exploratory session, complementing HICCUPPS-F (which catalogues what to compare against)."
rating: 24
d6: 4
archetype: S2
---

# sfdpot-heuristic

## Overview

SFDPOT is James Bach's "San Francisco Depot" heuristic - a
catalogue of **what can be varied** during testing. Published at
[satisfice.com](https://www.satisfice.com/heuristics-of-software-testability)
and in James Bach's testing-curriculum materials.

If HICCUPPS-F
([`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md))
catalogues *what to compare against* (oracles), SFDPOT catalogues
*what to change* during exploration. Together they form a complete
"how to think about a session" pair.

This skill is a **pure reference** consumed by
[`exploratory-charter-author`](../../agents/exploratory-charter-author.md)
and by testers mid-session.

## When to use

- Authoring a charter: pick which SFDPOT dimensions the session
  should vary.
- Mid-session: tester feels stuck - walk SFDPOT for new ideas of
  what to vary.
- Bug-bashing: assign different dimensions to different testers
  so coverage spreads.

## The six dimensions

### S - Structure

> What can I vary about how the system is **built**?

The internals of the system. Includes:

- Code paths (branches, recursive depths)
- Build / compiler options
- Module / component connection topology
- Internal-data structures (cache state, in-memory buffers,
  thread pools)
- Deployment shape (single instance vs cluster, sidecar vs not)

A "Structure" exploration might toggle internal options, route
through a non-standard code path, or inspect how the system behaves
under a non-default build.

### F - Function

> What can I vary about what the system **does**?

The feature surface area. Includes:

- Functions / features (each can be exercised individually)
- Feature combinations (feature A + feature B interaction)
- Error / recovery paths (what happens when X fails?)
- Boundary / edge functions (cancel, undo, redo, rollback)

A "Function" exploration runs each function - and especially
combinations - that the test plan didn't enumerate.

### D - Data

> What can I vary about the **values** the system handles?

The input + state space. Includes:

- Input boundary values (0, 1, max, max+1, min, min-1)
- Input formats / encodings (UTF-8, UTF-16, Windows-1252)
- Data volumes (empty, single, 1k, 1M, 1B)
- Data shapes (deeply nested, flat, sparse, dense)
- Data corruption (truncated, malformed, missing fields)
- Special values (null, undefined, NaN, Infinity)

A "Data" exploration feeds pathological inputs - see
[`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md)
for canonical payloads.

### P - Platform

> What can I vary about the **environment** the system runs on?

The deployment platform. Includes:

- OS (Windows / Linux / macOS, version)
- Browser (Chrome / Firefox / Safari / Edge, version)
- Mobile device (iOS / Android, version, model)
- Hardware (CPU architecture, memory, storage)
- Network (Wi-Fi vs cellular, low bandwidth, high latency, lossy)
- Locale (language, region, timezone, calendar)

A "Platform" exploration tests across the matrix. Compose with
[`qa-compatibility`](../../../qa-compatibility/) for systematic
matrix testing.

### O - Operations

> What can I vary about **how the system is used**?

User behaviour patterns. Includes:

- User workflows (paths through the UI / API)
- Tasks (the user's actual goals - see ISTQB use-case)
- User skill levels (novice vs expert pacing, undo + redo
  frequency)
- Concurrency (single user vs many, simultaneous edits)
- Frequency (rare event vs continuous use)

An "Operations" exploration simulates real user workflows rather
than test scripts.

### T - Time

> What can I vary about **when / for how long** things happen?

Temporal dimensions. Includes:

- Duration (1 ms, 1 s, 1 min, 1 hour, 1 day, 1 year of uptime)
- Order (do A then B vs B then A)
- Concurrency / race conditions (A and B simultaneously)
- Clock edges (DST transition, leap day, year-end rollover, leap
  second)
- Cache TTLs (just expired vs just refreshed)
- Session timeouts (just before expiry, at expiry, after expiry)

A "Time" exploration is the hardest to plan - many time-related
bugs require deliberate clock manipulation. See
[`qa-time-and-timezones`](../../../qa-time-and-timezones/) for
clock-mocking tooling (Tier 2 ROADMAP - not yet shipped at this
writing).

## Worked example - applying SFDPOT to a checkout charter

Charter: "Explore the checkout flow to discover bugs."

```markdown
Apply SFDPOT to plan the session:

- **S — Structure:** Toggle the `feature-new-checkout=true` flag
  in middle of the session to compare old vs new code paths.
- **F — Function:** Stack multiple promos; combine with gift card;
  combine with store credit. Trigger refund mid-checkout.
- **D — Data:** Cart with 0 items, 1, 100, 1000 items. Cart with
  free items only. Cart with $0.01 total. Cart with $9999.99
  total. Invalid product IDs.
- **P — Platform:** Safari iOS (autofill / Apple Pay), Chrome
  desktop, low-bandwidth Android.
- **O — Operations:** Add → remove → re-add an item. Navigate
  away and return. Refresh during payment processing.
- **T — Time:** Apply a promo that expires in 1 minute, then
  delay 70 seconds. Open two tabs simultaneously and check out
  from each.
```

This shapes a richer session than "click around the checkout
page."

## SFDPOT vs other heuristics

| Heuristic | What it catalogs |
|---|---|
| **SFDPOT** | What to **vary** during exploration |
| **HICCUPPS-F** | What to **compare against** when interpreting observations |
| **FCC-CUTS-VIDS** | What to **list** about the system (specification-style) |
| **CRUSSPIC-STMPL** | Quality **criteria** to evaluate against |
| **Tours (Whittaker)** | Themed exploration **missions** |

They're complementary, not competing - a strong session uses
multiple. Bach + Bolton's
*Rapid Software Testing* curriculum teaches all of them as a
toolkit.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking one dimension only | Other dimensions yield bugs the chosen one misses | Mention each dimension's pick in the charter |
| Skipping Time | Time bugs are common but easy to forget | Always consider T in any session involving state |
| Confusing Data + Operations | Variants overlap | Data = *what values*; Operations = *how the user moves through* |
| Pre-scripting SFDPOT into test cases | Defeats exploration | SFDPOT is for *generating ideas*; the tester decides moment-to-moment |
| Operations as "user persona testing" | Not exactly: Operations is variant-of-use, not variant-of-user (which is Platform's locale + skill / familiarity) | Treat O as variation of use-patterns |

## Limitations

- **Heuristic, not exhaustive.** Bugs can hide in dimensions
  SFDPOT doesn't enumerate (cross-cutting concerns like security,
  observability) - those have their own heuristic catalogs.
- **Requires deliberate practice.** A new tester walks SFDPOT
  mechanically; an experienced one fluently considers each
  dimension in seconds.
- **Variation cost is real.** Some dimensions (Platform full
  matrix; Time clock manipulation) require infrastructure that
  may not exist for ad-hoc exploration.

## References

- Bach J. *Heuristics of Software Testability* - 
  [satisfice.com/heuristics-of-software-testability](https://www.satisfice.com/heuristics-of-software-testability).
- Bach J. + Bolton M. *Rapid Software Testing* curriculum - 
  [satisfice.com/rapid-software-testing](https://www.satisfice.com/rapid-software-testing).
- Bolton M. *San Francisco Depot* - 
  [developsense.com](https://developsense.com/).
- Sibling references:
  [`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md),
  [`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md),
  [`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md),
  [`sbtm-reference`](../sbtm-reference/SKILL.md),
  [`tour-based-explorer-prompt`](../tour-based-explorer-prompt/SKILL.md).
- Consumed by:
  [`exploratory-charter-author`](../../agents/exploratory-charter-author.md).
