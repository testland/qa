# Worked example - top of a QBR quality narrative

The governing layer of a real QBR narrative built with exec-quality-narrative: the Answer
first, an SCQA opening, four MECE support groups, and the ask as its own group. Every
number carries the artifact it came from. Everything below this layer in the real document
is appendix - per-team tables, the digests themselves, methodology - that executives can
descend into but do not need to reach the answer.

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
