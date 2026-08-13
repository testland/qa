# SFDPOT - Bach's what-to-vary heuristic

Deep reference for `exploratory-testing` SKILL.md. SFDPOT is James Bach's
"San Francisco Depot" heuristic - a catalogue of **what can be varied**
during testing. Published at
[satisfice.com](https://www.satisfice.com/heuristics-of-software-testability)
and in James Bach's testing-curriculum materials.

If HICCUPPS-F ([hiccupps-f.md](hiccupps-f.md)) catalogues *what to compare
against* (oracles), SFDPOT catalogues *what to change* during
exploration. Together they form a complete "how to think about a
session" pair.

## When to use

- Authoring a charter: pick which SFDPOT dimensions the session
  should vary ([charter-template.md](charter-template.md)).
- Mid-session: tester feels stuck - walk SFDPOT for new ideas of
  what to vary.
- Bug-bashing: assign different dimensions to different testers
  so coverage spreads.

## How to use

1. **Name the target.** State the feature or area under test in one
   line (e.g. "the checkout flow").
2. **Walk all six dimensions.** For each of S, F, D, P, O, T, ask its
   prompt from the table below and jot 1-3 concrete variables worth
   trying. Pull ideas from the full per-dimension catalog below when a
   dimension feels thin.
3. **Fold the picks into a charter.** Each dimension's line becomes a
   mission for the session - see the umbrella SKILL.md's charter section.
4. **Explore, then re-walk when stuck.** If ideas dry up mid-session,
   walk SFDPOT again - a dimension you skipped usually holds the next
   bug.
5. **Interpret with an oracle.** For each surprise, reach for HICCUPPS-F
   ([hiccupps-f.md](hiccupps-f.md)) to decide whether it is actually a bug.

The worked example below applies exactly these steps to a checkout
charter.

## The six dimensions

SFDPOT names six axes of variation. Pick one or more per session.

| Dim | What to vary | Sample variables |
|---|---|---|
| **S - Structure** | how the system is **built** | code paths, build options, module topology, cache / buffer state, cluster vs single instance |
| **F - Function** | what the system **does** | individual features, feature combinations, error / recovery paths, undo / redo / rollback |
| **D - Data** | the **values** it handles | boundaries (0, max, max+1), encodings, volumes (empty to 1B), corruption, null / NaN / Infinity |
| **P - Platform** | the **environment** it runs on | OS, browser, device, hardware, network (bandwidth / latency), locale |
| **O - Operations** | how it is **used** | workflows, user goals, novice vs expert pacing, concurrency, frequency |
| **T - Time** | **when / how long** things happen | duration, order (A then B vs B then A), race conditions, clock edges (DST, leap day), TTLs, session expiry |

Data varies *what values*; Operations varies *how the user moves
through*.

## The six dimensions in full

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
`malicious-payload-bank` for canonical payloads.

### P - Platform

> What can I vary about the **environment** the system runs on?

The deployment platform. Includes:

- OS (Windows / Linux / macOS, version)
- Browser (Chrome / Firefox / Safari / Edge, version)
- Mobile device (iOS / Android, version, model)
- Hardware (CPU architecture, memory, storage)
- Network (Wi-Fi vs cellular, low bandwidth, high latency, lossy)
- Locale (language, region, timezone, calendar)

A "Platform" exploration tests across the matrix - compose with the
browser/OS matrix skills in qa-web-e2e / qa-ci-integration for
systematic matrix testing.

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
bugs require deliberate clock manipulation.

## Worked example - applying SFDPOT to a checkout charter

Charter: "Explore the checkout flow to discover bugs."

```markdown
Apply SFDPOT to plan the session:

- **S - Structure:** Toggle the `feature-new-checkout=true` flag
  in middle of the session to compare old vs new code paths.
- **F - Function:** Stack multiple promos; combine with gift card;
  combine with store credit. Trigger refund mid-checkout.
- **D - Data:** Cart with 0 items, 1, 100, 1000 items. Cart with
  free items only. Cart with $0.01 total. Cart with $9999.99
  total. Invalid product IDs.
- **P - Platform:** Safari iOS (autofill / Apple Pay), Chrome
  desktop, low-bandwidth Android.
- **O - Operations:** Add, remove, re-add an item. Navigate
  away and return. Refresh during payment processing.
- **T - Time:** Apply a promo that expires in 1 minute, then
  delay 70 seconds. Open two tabs simultaneously and check out
  from each.
```

This shapes a richer session than "click around the checkout
page." Each bullet becomes one mission line in the charter.

## SFDPOT vs other heuristics

| Heuristic | What it catalogs |
|---|---|
| **SFDPOT** | What to **vary** during exploration |
| **HICCUPPS-F** | What to **compare against** when interpreting observations |
| **FCC-CUTS-VIDS** | What to **list** about the system (specification-style) |
| **CRUSSPIC-STMPL** | Quality **criteria** to evaluate against |
| **Tours (Whittaker)** | Themed exploration **missions** |

They're complementary, not competing - a strong session uses
multiple. Bach + Bolton's *Rapid Software Testing* curriculum
teaches all of them as a toolkit.

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
- Sibling references: [hiccupps-f.md](hiccupps-f.md),
  [fcc-cuts-vids.md](fcc-cuts-vids.md), [crusspic-stmpl.md](crusspic-stmpl.md),
  [tours.md](tours.md).
