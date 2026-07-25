# SFDPOT - the six dimensions in full

Deep reference for `sfdpot-exploratory-heuristic` SKILL.md. Consult
mid-session when the compact table in the skill isn't enough and you want
the full list of variables to try under each dimension.

## S - Structure

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

## F - Function

> What can I vary about what the system **does**?

The feature surface area. Includes:

- Functions / features (each can be exercised individually)
- Feature combinations (feature A + feature B interaction)
- Error / recovery paths (what happens when X fails?)
- Boundary / edge functions (cancel, undo, redo, rollback)

A "Function" exploration runs each function - and especially
combinations - that the test plan didn't enumerate.

## D - Data

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

## P - Platform

> What can I vary about the **environment** the system runs on?

The deployment platform. Includes:

- OS (Windows / Linux / macOS, version)
- Browser (Chrome / Firefox / Safari / Edge, version)
- Mobile device (iOS / Android, version, model)
- Hardware (CPU architecture, memory, storage)
- Network (Wi-Fi vs cellular, low bandwidth, high latency, lossy)
- Locale (language, region, timezone, calendar)

A "Platform" exploration tests across the matrix. Compose with
`qa-compatibility` for systematic matrix testing.

## O - Operations

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

## T - Time

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
bugs require deliberate clock manipulation. See `qa-time` for
clock-mocking tooling (Tier 2 ROADMAP - not yet shipped at this
writing).
