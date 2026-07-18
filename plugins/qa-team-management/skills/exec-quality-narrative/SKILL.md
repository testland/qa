---
name: exec-quality-narrative
description: "Build-an-X workflow that turns already-computed quality data - weekly digests, KPI roll-ups, DORA delivery metrics, escape-defect trends, OKR grading - into an executive or QBR narrative structured by the Minto Pyramid Principle: governing answer first, MECE-grouped support beneath it, SCQA opening (Barbara Minto, The Pyramid Principle, ISBN 978-0273710516). Distinct from single-team digest computation in qa-roles (which computes the RAG digest from raw CI and tracker signals; this skill consumes such digests and writes the upward story), from portfolio-review aggregation in qa-roles (which aggregates teams into a portfolio review; this skill is the communication layer either output feeds), and from `qa-okr-author` in qa-process (forward-looking commitments; this skill narrates what happened and what it means). Use before a QBR, board update, or exec review when the data exists but the story does not."
keywords: ["executive-narrative", "qbr", "minto-pyramid", "dora-metrics", "quality-reporting", "scqa"]
---

# exec-quality-narrative

## Overview

QA leaders usually walk into a QBR with the data inverted: twelve slides of metrics building toward a conclusion on slide thirteen. Executives read in the opposite direction. The **Minto Pyramid Principle** (Barbara Minto, *The Pyramid Principle: Logic in Writing and Thinking*, ISBN 978-0273710516) prescribes that "ideas should be communicated in a pyramid format in which ideas are organized top-down, starting with a main idea", with groupings under it that are **MECE** - mutually exclusive, collectively exhaustive - because, per Minto, one "can't derive an idea from a grouping unless the ideas in the grouping are logically the same, and in logical order" ([Barbara Minto, Wikipedia](https://en.wikipedia.org/wiki/Barbara_Minto), fetched 2026-06-10). The book's opening device is **SCQA**: Situation, Complication, Question, Answer - state the stable context, the thing that changed, the question that raises, and the answer immediately (ISBN 978-0273710516).

This skill applies that structure to quality data the marketplace already produces: the answer at the top, two to four MECE support groups under it, every number citing the artifact it came from.

## When to use

- A QBR, board update, or exec quality review is scheduled and the inputs (digests, KPI tables, OKR grades) exist but read as data, not narrative.
- Leadership asks "is quality getting better or worse?" and the honest answer needs structure plus evidence rather than a dashboard link.
- A quality investment ask (headcount, tooling, time) needs an exec-shaped argument built on the quarter's evidence.

Do **not** use this skill to:

- Compute the underlying metrics - upstream roles in qa-roles compute single-team digests from CI and tracker data and roll teams into a portfolio review. This skill starts where they end.
- Draft next quarter's commitments - that is `qa-okr-author` (in qa-process); the narrative may end by pointing at the OKR set, not by inventing one.
- Report to engineering peers. The audience here holds budget, not backlogs; a sprint-level test report is a different artifact.

## Step 1 - Capture the inputs

| Input | Source | Role in the narrative |
|---|---|---|
| **Quality digests** | Per-team quality digest output, or equivalent | Pass-rate trend, escape counts, flake debt with citations already attached |
| **Portfolio roll-up** | Portfolio roll-up output, if multi-team | Cross-team table, risk heatmap, capacity view |
| **DORA delivery metrics** | CI / deploy data per [dora.dev](https://dora.dev/guides/dora-metrics-four-keys/) | Delivery context executives often already know from engineering reporting |
| **OKR grading** | `qa-okr-author` (qa-process) set + end-of-quarter grades | Commitment-vs-delivery evidence |
| **Escape trend** | Defect-tracker trend (e.g., a defect-trend narrative) | The quality outcome line executives care about most |
| **Audience + ask** | Who reads this, and what decision (if any) is being requested | Determines the Answer sentence and whether the narrative is informational or an investment case |

Halt with `UNCITED_INPUTS` if the supplied numbers carry no source artifacts: a narrative built on unattributed figures collapses at the first follow-up question.

## Step 2 - Verify the DORA vocabulary before using it

Executives increasingly hear DORA terms from engineering leadership, so use them precisely. As of the current guidance, DORA defines **five** software delivery metrics, evolved from the original four keys ([dora.dev/guides/dora-metrics-four-keys/](https://dora.dev/guides/dora-metrics-four-keys/), fetched 2026-06-10):

- Throughput: **change lead time** ("the amount of time it takes for a change to go from committed to version control to deployed in production"), **deployment frequency** ("the number of deployments over a given period or the time between deployments"), **failed deployment recovery time** ("the time it takes to recover from a deployment that fails and requires immediate intervention").
- Instability: **change fail rate** ("the ratio of deployments that require immediate intervention following a deployment"), **deployment rework rate** ("the ratio of deployments that are unplanned but happen as a result of an incident in production").

Two precision rules for the narrative: (1) escape-defect rate is a defect-leakage metric, **not** a DORA metric - DORA measures delivery; do not blend them under one label (single-team digest reporting draws the same line); (2) if the org still says "the four keys", note the recovery-time rename rather than silently mixing old and new names.

## Step 3 - Write the pyramid top: SCQA + the Answer sentence

Draft the governing thought before touching slides. Per the SCQA device (ISBN 978-0273710516):

- **Situation:** the stable fact the audience already accepts ("We ship weekly to 40k customers; quality reporting covers all four product teams.")
- **Complication:** what changed ("Q2 doubled deployment frequency while QA headcount was flat.")
- **Question:** the question that complication forces ("Did quality hold?")
- **Answer:** one sentence, with the trend and the cost attached ("Quality held on three of four teams; checkout regressed and needs one decision from this group.")

The Answer sentence is the narrative's title. If it cannot be written, the analysis is not done; go back to the inputs, not to the slide deck.

## Step 4 - Build 2 - 4 MECE support groups

Group every finding under headers that do not overlap and jointly cover the story. A grouping that works repeatedly for quality narratives: **outcomes** (escapes, incidents, customer-visible quality), **delivery** (DORA metrics, cycle time), **commitments** (OKR grades), **capacity/risk** (staffing, flake debt, bus factors). Each group gets one claim sentence supported by cited numbers; per Minto, the items inside a group must be "logically the same" ([Wikipedia, Barbara Minto](https://en.wikipedia.org/wiki/Barbara_Minto)) - do not mix an outcome stat into the delivery group because it is impressive.

## Step 5 - Emit the narrative

Worked example (top of a real QBR narrative; numbers carry their sources):

```markdown
# Quality QBR - 2026-Q2

**Answer first:** Quality held through a 2x delivery acceleration on three of four
teams; checkout regressed (3 P1 escapes vs 1 in Q1) and recovers only if this
group approves the test-data investment below.

**Situation.** Four product teams, weekly releases, quality reporting per team
digest. **Complication.** Deployment frequency doubled (38 -> 81 deploys/quarter,
CI deploy log) at flat QA headcount. **Question.** Did quality hold?

## 1. Outcomes - held, except checkout
P1 escapes: 4 in Q2 vs 5 in Q1 (tracker, severity=P1, found_in=production), but
3 of 4 concentrated in checkout (vs 1 in Q1). Checkout's escapes trace to
unseeded test environments in 9 of 11 retro findings (Q2 escape retros).

## 2. Delivery - faster, stable
Deployment frequency 38 -> 81; change fail rate 4.9% -> 5.2% (deploy log over
incident tags; definitions per dora.dev). Delivery acceleration did not buy
instability - the checkout regression is a test-gap story, not a velocity story.

## 3. Commitments - 3 of 4 OKRs landed
KR grades from the Q2 OKR set: regression cycle time 1.0, flake budget 0.8,
escape-rate KR missed on checkout only (qa-okr-author grading sheet).

## 4. The decision
One ask: 6 engineer-weeks for seeded checkout test data. Expected effect:
removes the cause named in 9 of 11 escape retros. Alternative considered and
rejected: +1 headcount (slower, does not fix the environment gap).
```

Everything below this layer in the real document is appendix: per-team tables, the digests themselves, methodology. Executives who want it can descend the pyramid; the ones who do not have already gotten the answer.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Conclusion on the last slide | Executives decide in the first two minutes; the build-up reads as hedging | Answer-first per the pyramid (ISBN 978-0273710516) |
| Metric dump as narrative | Data without a governing claim delegates the synthesis to the reader | Step 3: no deck before the Answer sentence exists |
| Overlapping groups | The same fact argued twice reads as padding; MECE exists to prevent it | Step 4 grouping check |
| Calling escape rate a DORA metric | Mislabels defect leakage as delivery performance; one informed exec follow-up sinks the room's trust | Step 2 vocabulary rules ([dora.dev](https://dora.dev/guides/dora-metrics-four-keys/)) |
| Uncited numbers | First "where is that from?" without an answer discredits the cited ones too | Step 1 halts on uncited inputs |
| Good-news filtering | Hiding the checkout regression converts a report into a liability when it surfaces anyway | The Complication slot exists precisely for the bad news |
| Burying the ask | A decision request hidden in slide 11 gets no decision | The ask is a top-level group with its own header |

## Limitations

- **Garbage in, story out.** The narrative inherits the quality of the digests and trackers beneath it; this skill structures evidence, it cannot create it.
- **SCQA and the pyramid are cited to the book.** The Minto sources fetchable online describe the pyramid and MECE; SCQA's full treatment is in the book itself (ISBN 978-0273710516), cited here as a management framework.
- **No automatic data pulls.** This skill consumes outputs of the agents named in Step 1; wiring live dashboards into prose is out of scope.
- **One narrative, one audience.** A board version and an engineering-leadership version differ in Answer and asks; produce two artifacts rather than one compromise.

## Hand-off targets

- **Single-team digest inputs** → per-team quality digest reporting (qa-roles).
- **Multi-team portfolio inputs** → portfolio roll-up reporting (qa-roles).
- **Next quarter's commitments the narrative points at** → `qa-okr-author` (in qa-process).
- **Capability asks surfaced in the narrative** → capability gap analysis for the train-vs-hire grounding.

## References

- Barbara Minto, *The Pyramid Principle: Logic in Writing and Thinking*, ISBN 978-0273710516 - pyramid structure, SCQA opening, answer-first discipline.
- Barbara Minto (Wikipedia) - pyramid format "organized top-down, starting with a main idea"; MECE; the logical-grouping quote: https://en.wikipedia.org/wiki/Barbara_Minto (fetched 2026-06-10).
- DORA software delivery metrics - five-metric model and verbatim definitions used in Step 2: https://dora.dev/guides/dora-metrics-four-keys/ (fetched 2026-06-10).
- Per-team digest and portfolio roll-up reporting (qa-roles), and `qa-okr-author` (qa-process) - the upstream producers of this skill's inputs.
