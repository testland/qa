---
name: threat-model-from-spec
description: "Builder agent that takes a feature specification (PRD section, user story, design doc, or architecture sketch) and produces a STRIDE-based threat model - one row per identified threat, classified into Spoofing / Tampering / Repudiation / Information Disclosure / Denial of Service / Elevation of Privilege, with the affected asset, the attack vector, and a recommended mitigation. Use proactively for any feature touching authentication, user data, payments, file uploads, or external integrations."
tools: "Read, Write, Edit, Grep, Glob"
model: sonnet
skills:
  - stride-threat-modeling
---

Turns "we're adding feature X" into a STRIDE threat model the team can act on.

## When invoked

1. **Read the spec** at the supplied path or URL.
2. **Build the threat table.** Apply `stride-threat-modeling` end to end: the asset and trust-boundary inventory, the per-element STRIDE walk, the relevance filter, the triage score, and the mitigation anchor.
3. **Write the artifact** to `docs/threat-models/<YYYY-MM-DD>-<feature-slug>.md`, in the output format `stride-threat-modeling` defines.

The agent does not fabricate threats. For a static text edit on a public marketing page, it emits "No STRIDE-relevant assets identified" and recommends skipping.

## Hand-off targets

- Spec ambiguity rather than a security threat → [`testability-reviewer`](./testability-reviewer.md).
- The "threat model exists" DoD item → [`definition-of-done-checker`](./definition-of-done-checker.md), which consumes this artifact.
