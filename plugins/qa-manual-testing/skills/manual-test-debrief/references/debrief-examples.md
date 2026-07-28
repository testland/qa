# Worked debrief, rollup, and attention tracker

Deep reference for `manual-test-debrief` SKILL.md. The skill body carries
a blank PROOF template; this file holds the fully-filled example plus the
two aggregation artifacts.

## A fully worked debrief (promo-code checkout session)

```markdown
# Session debrief - `<session-id>`

**Charter:** [link to charter]
**Tester:** _______________
**Date:** _______________
**Time-box:** 90 min   **Actual:** ___ min
**Build / Environment:** _______________

## Past - what was tested

**Tours applied:**
- [x] Money tour (per `exploratory-tours-reference`)
- [x] Bad-data tour
- [ ] Configuration tour (skipped - out of time)

**Areas covered:**
- Promo code input field - full coverage including SQL/XSS payloads
- Promo discount math - 10% / 50% / 100% / fractional cent edge cases
- Promo + tax interaction - covered for US tax states only

**Paths walked (notable ones):**
- Apply WELCOME10 to $24.99 cart -> $22.49 (pass)
- Apply two stackable promos -> second silently overrides first (BUG-987)
- Apply expired promo -> graceful error message (pass)

## Results - what was learned

**Confirmed working:**
- Single-promo apply
- Promo code expiration enforcement
- Free-shipping promo

**Bugs found:** (with bug IDs)
- BUG-987: Stacking two promos doesn't combine - second silently overrides first.
- BUG-988: SQL injection in promo input field returns 500 instead of 400.
- BUG-989: $0.01 cart with 50% off rounds to $0.00 instead of $0.01.

**Surprises:**
- Discount is applied to subtotal BEFORE tax, but the original SOW
  said after-tax. Need to clarify with PM.
- "WELCOME10" code is case-sensitive; "welcome10" silently rejected
  with no helpful message.

**Confirmed-fixed (vs prior session):**
- Previous BUG-832 (promo input losing focus) is fixed. (pass)

## Outlook - what's left

**Areas not covered (out of time / scope):**
- EU tax cases (covered separately by next session's charter).
- Multi-currency promo behavior.
- Promo + subscription billing.

**Recommended next charter:**
- "Explore the EU tax + promo interaction" (90 min).
- "Explore promo + subscription billing edge cases" (60 min).

**Open questions for PM / dev team:**
- Confirm: discount before vs after tax (cited as "before" in
  current implementation; SOW says "after").
- Confirm: should case-insensitive promo codes be supported?

## Obstacles

**Setup pain:**
- Stripe test card kept timing out at checkout - added 5 min to
  the session.
- Required test promo codes weren't pre-seeded; had to create them
  manually.

**Environment instability:**
- Staging was down for ~10 min mid-session; lost momentum.

**Recommendations for next session:**
- Pre-seed promo codes via a fixture per `synthetic-data-tool-selector`.
- Verify staging is up before session start.

## Feelings

**Quality of attention this session:** Strong (focused throughout;
caught the BUG-987 cluster early which sustained interest).

**Confidence in the feature:** Mixed. The single-promo path is
solid; the multi-promo path has architectural issues that aren't
just bugs (SOW ambiguity on discount-before-tax suggests the
business hasn't fully decided).

**Unease about untested areas:** Moderate. Multi-currency promos
weren't touched; gut says there are bugs there.

**Recommendation to release manager:** Block release until
BUG-987 (stacking) and BUG-988 (SQL injection) are fixed.
BUG-989 (rounding) is low impact; can ship with known-issue note.

## Time accounting (3-bucket)

| Bucket            | Minutes |
|-------------------|--------:|
| Test design       |      35 |
| Setup             |      25 |
| Bug investigation |      30 |
| **Total actual**  |      90 |
```

## Aggregation across sessions

Aggregating debriefs surfaces patterns individual reports can't:

```markdown
## Quarterly debrief rollup - Q2 2026

**Sessions completed:** 47
**Bugs raised:** 138
**Average session: 90-min charter, 3-bucket: 38 / 28 / 24**

### Areas by coverage

| Area                       | Sessions | Bugs found | Last covered |
|----------------------------|---------:|-----------:|--------------|
| Checkout - promo flow       |    8    |    34     | 2026-04-28  |
| Checkout - payment          |    6    |    19     | 2026-05-02  |
| Account - subscription       |    4    |    12     | 2026-05-05  |
| Account - profile            |    3    |     8     | 2026-04-15  |
| Admin panel                  |    1    |     2     | 2026-03-20  |  (stale)
| Reports                      |    0    |     0     | (never)      |  (uncovered)

### Action items from rollup

- Schedule sessions for Admin panel + Reports areas (under-covered).
- Subscription area surfaced 12 bugs - investigate root-cause
  pattern.
- Average setup time (28 min) is high - invest in fixture tooling.
```

The rollup shows what's been explored vs what's stale vs what's never been
touched. Charter authoring uses this to pick where the next session focuses.

## Quality-of-attention signal

The Feelings section produces a per-session subjective signal. Track it
over time:

| Session  | Feelings (numeric: 1-5) | Notes                               |
|----------|-------------------------|-------------------------------------|
| ses-201  |                       4 | Strong; BUG cluster found early.    |
| ses-202  |                       2 | Weak; tester sick / distracted.     |
| ses-203  |                       5 | Excellent; new tester, fresh eyes.  |

When attention is consistently low across a tester / area, change
something - different tester, different time-box, different tour,
different scope.
