# SBTM session sheet + metrics in full

Deep reference for `session-based-test-management-reference` SKILL.md. Consult
when authoring or reviewing a session sheet, or building the cross-session
dashboard. Holds the canonical sheet template, the TBS time-breakdown, and the
dashboard metrics.

## The session sheet

Each session produces a session sheet. Bach's canonical structure
(satisfice.com):

```markdown
# Session sheet - YYYY-MM-DD - <tester>

## Charter

Explore <area> with <tools> to discover <information>.

## Areas

- (system area 1)
- (system area 2)
- ...

## Session start / duration / setup time / focus

- Started: 14:00
- Duration: 90 min
- Setup time: 10 min
- Charter time: 70 min
- Bug-investigation time: 10 min
- Opportunity time: 0 min

## TBS metrics (time-breakdown)

- Test design + execution: 70%
- Bug investigation + reporting: 11%
- Setup / overhead: 11%
- Opportunity: 0%
- Idle / interruption: 8%

## Data files

- screenshots/2026-05-20-14-15.png
- har/2026-05-20-14-22.har

## Test notes

(narrative of what was tested, in tester's own words; includes
tours applied, heuristics applied, hypotheses formed)

## Bugs (file later)

- B-001: Promo "STACK50" applies after tax instead of before;
  reproduces 3/3. Captured at 14:35.
- B-002: Empty cart + apply promo → page error, not graceful message.

## Issues (meta - testing-process problems)

- Cannot get to step 4 in flow without a paid customer account;
  test data unavailable. Blocking 40% of charter scope.

## PROOF debrief

(See manual-test-debrief)
```

## TBS metrics - time breakdown

Per Bach's SBTM paper, sessions decompose into:

| Category | Definition |
|---|---|
| **T** (Test) | Time spent on test design + execution per the charter |
| **B** (Bug) | Time spent investigating + reporting bugs |
| **S** (Setup) | Time setting up the environment / test data / tools |

Plus often-included:

- **Opportunity:** unrelated bugs found by chance; investigated outside charter scope
- **Idle:** waiting on a build / response

Healthy session: T 60-80%, B 10-20%, S 10-15%. Skewed sessions
(T < 50%) signal problems - environment instability, charter too
broad, etc.

## Dashboard metrics - across sessions

Per Bach's SBTM Reporting paper (satisfice.com), the lead views:

| Metric | What it tells |
|---|---|
| **Sessions per week** | Throughput |
| **Avg T% across sessions** | Environment / charter-scope health |
| **Bugs per session** | Find rate (interpret carefully - not all sessions should find bugs) |
| **Charters complete / in-progress / blocked** | Coverage progress |
| **Charter-to-bug ratio** | Quality of charter framing (too broad = many small bugs; too narrow = few) |

These feed the testing-strategy review at sprint planning.
