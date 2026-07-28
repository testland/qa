# ADR background and field mapping

Deep reference for the `tool-selection-decision-record` SKILL.md. How this record's eight fields map onto the canonical five-part Architecture Decision Record, and why the ADR Consequences field is split into two here. The spine keeps the field table and the four rules; this file carries the ADR provenance.

## Canonical ADR shape

An ADR is "a document that captures an important architecture decision made along with its context and consequences" ([joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record)), and the canonical five-part shape is Title, Context, Decision, Status, Consequences ([Nygard, Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). A tool choice is a decision of exactly that kind: it "addresses a functional or non-functional requirement that is architecturally significant" ([adr.github.io](https://adr.github.io/)).

This record keeps the ADR skeleton and tightens three things generic ADR templates leave open: how many tools may be recommended (Rule 1), what counts as admissible evidence for the context (Rule 2), and whether the reversal conditions are optional (Rule 3).

## How the fields map to a standard ADR

| ADR field ([Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) | Field here |
|---|---|
| Title | Title |
| Status | Status |
| Context ("the forces at play") | Signal, restricted to observed project evidence |
| Decision | Decision, restricted to one tool |
| Consequences ("all consequences ... not just the positive ones") | Rationale (the why-not clause) plus Flip conditions |

The split of Consequences into two fields is deliberate. Nygard requires that "all consequences should be listed here, not just the 'positive' ones" ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)), and in practice tool records collapse to a list of benefits unless the negative half has its own heading with its own required content.
