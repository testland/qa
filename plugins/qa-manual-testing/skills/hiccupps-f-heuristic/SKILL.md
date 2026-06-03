---
name: hiccupps-f-heuristic
description: "Pure-reference catalog of Michael Bolton's HICCUPPS-F oracle heuristic - eight (plus one) reference points for deciding whether something is a problem. Each letter is a kind of oracle the tester consults: History, Image, Comparable products, Claims, Users' desires, Product (internal consistency), Purpose, Standards / statutes, plus Familiar problems. Use as the heuristic vocabulary an exploratory session draws on when asking 'should this behaviour be a bug?'"
rating: 24
d6: 4
---

# hiccupps-f-heuristic

## Overview

HICCUPPS-F is Michael Bolton's oracle heuristic - a mnemonic for
the **kinds of references** a tester consults to decide whether
an observation is a problem. It's published at
[developsense.com/blog/2012/07/hiccupps-f](https://developsense.com/blog/2012/07/hiccupps-f-the-heuristic/).

The point: a "bug" is a relationship between an observation and
some expectation. Different expectations come from different
oracles. HICCUPPS-F gives the tester a checklist of oracle types
to consult before deciding "no oracle ⇒ probably not a bug" or
"oracle says X ⇒ behaviour Y is wrong."

This skill is a **pure reference** consumed by the
[`exploratory-charter-author`](../../agents/exploratory-charter-author.md)
and by individual testers during sessions
([`sbtm-reference`](../sbtm-reference/SKILL.md)).

## When to use

- Mid-session: tester sees behaviour X, asks "is this a bug?" - 
  walk HICCUPPS-F to find the matching oracle.
- Authoring a charter: pre-identify which oracles the session
  should consult.
- Bug-report review: the bug report's "why is this a bug?" must
  cite at least one HICCUPPS-F oracle.
- Onboarding: this is the canonical "where do test expectations
  come from?" vocabulary.

## The nine oracles

Per Bolton's published catalog:

### H - History

> Does the system's current behaviour match what it did before?

Behaviour regressed from a known prior version = bug. Sources:

- Git blame on the relevant code path
- Previous release notes / changelog
- Old screenshots / videos in user-acceptance archives
- The release-1.2 regression suite ([`qa-test-impact-analysis`](../../../qa-test-impact-analysis/))

### I - Image

> Does the behaviour match the company's brand and reputation?

The product's overall feel: error messages should not be hostile,
loading states should look professional, copy should be on-brand.
Sources:

- Brand guidelines / style guide
- Marketing materials
- Comparable user touchpoints (the company's other products)

### C - Comparable products

> Does the behaviour match what competitors / peers do?

Industry conventions. A login form that lacks "forgot password"
when every competitor has one. Sources:

- Competitor screenshots
- Industry benchmark reports
- Stack Overflow / dev forum norms

### C - Claims

> Does the behaviour match what stakeholders said it would do?

The spec, the requirements document, the customer-promise email,
the sales-deck slide. Sources:

- Requirements / acceptance criteria
- Spec docs
- Sales / marketing collateral
- Customer escalation transcripts

### U - Users' desires

> Does the behaviour match what users actually want / need?

Users may want something different than what the spec says.
Sources:

- User-research interviews
- Support-ticket aggregations
- NPS / CSAT comments
- Direct customer feedback

### P - Product (internal consistency)

> Does the behaviour match other behaviours in the same product?

The settings page uses a save button; the profile page does
auto-save. The same data field is formatted differently across
two screens. Sources:

- The product itself - explore adjacent areas
- Internal style guide
- Component library / design system

### P - Purpose

> Does the behaviour match the actual reason the feature exists?

The feature exists to help X do Y; the behaviour doesn't help X
do Y. Sources:

- Original feature design doc
- OKR / business justification
- Customer success outcomes

### S - Standards / statutes

> Does the behaviour comply with relevant standards + regulations?

WCAG accessibility, GDPR data handling, ISO 25010 quality
characteristics, PCI-DSS for payments, HIPAA for health, RFC for
network protocols. Sources:

- The applicable standard (cite the section)
- Regulatory body guidance
- Industry compliance reports

### F - Familiar problems

> Have we seen this kind of bug before, in this or other systems?

Pattern-matching against known bug classes:

- Off-by-one errors
- Time-zone edge cases (DST, leap day, leap second)
- Unicode normalisation (NFC vs NFD)
- Cache invalidation
- Race conditions on shared state

Sources:

- The team's bug history ([`qa-defect-management`](../../../qa-defect-management/))
- OWASP Top 10 / CWE Top 25
- Industry bug catalogs (Beizer, Kaner, Myers)

## Worked example - applying HICCUPPS-F mid-session

```markdown
Observation: Cart total shows $24.99 when promo "TAX10" applied,
but receipt PDF shows $25.49.

Walk HICCUPPS-F:

- H (History): Old screenshots from v1.4 show consistent totals.
  → This is a regression. **BUG.**
- I (Image): Inconsistent values reflect badly on the brand. Even
  if there's no other oracle, this fails Image.
- C (Comparable): Stripe / PayPal flows always show consistent
  totals across cart + receipt. **Industry convention violated.**
- C (Claims): Promo code spec says "TAX10 applies 10% before tax."
  Cart applies it before tax (correct); receipt applies it after
  tax (incorrect). **Spec violated.**
- U (Users' desires): Users will dispute the $0.50 difference
  with support. **Visible to customer.**
- P (Product): Cart and receipt should be consistent at minimum.
  **Internal consistency broken.**
- Purpose: Promo feature exists to encourage purchase; mismatched
  totals erode trust. **Purpose undermined.**
- S (Standards): Statutory? Possibly — depends on locale (some
  jurisdictions require receipts to match displayed totals).
- F (Familiar problems): Rounding-order bug; classic off-by-cent
  pattern. **Known bug class.**

Conclusion: Multiple oracles agree this is a bug. File
high-priority.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Consulting only one oracle | Misses bugs visible from other angles | Walk all 9; even briefly |
| "I don't see an oracle ⇒ probably fine" | Some bugs only one oracle catches (F - familiar problem patterns from elsewhere) | Look at F (familiar problems) before concluding "no oracle" |
| Charter doesn't pre-state expected oracles | Session aimless | Charter should hint at applicable oracles ("explore X with HICCUPPS-F focusing on Claims + Users + Standards") |
| Bug report without HICCUPPS-F citation | Report's "why is this a bug?" weak | Every bug report should cite at least one oracle from HICCUPPS-F |
| Treating Standards as final authority | Standards lag; users / purpose may indicate the real bug | Use all 9 as inputs, not as final-word hierarchy |
| Skipping F (familiar problems) for new product | Most "new" bugs are familiar patterns from other systems | Always check F |

## Limitations

- **Vocabulary, not algorithm.** HICCUPPS-F doesn't tell the
  tester *what* to test; it tells them *what kinds of references*
  to consult.
- **Oracles can disagree.** History says X but Claims says Y; the
  tester must reconcile.
- **Skill-dependent application.** A senior tester walks all 9
  fluently; a junior may need to refer to a checklist.
- **Some oracles cost-prohibitive.** User research (U) takes
  research; not feasible for every bug-or-not decision mid-session.

## References

- Bolton M. *HICCUPPS-F* (2012, refined from earlier HICCUPP) - 
  [developsense.com/blog/2012/07/hiccupps-f-the-heuristic/](https://developsense.com/blog/2012/07/hiccupps-f-the-heuristic/).
- Bolton M. *Testing oracle* concept - 
  [developsense.com](https://developsense.com/).
- Sibling references (other heuristic catalogues):
  [`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md),
  [`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md),
  [`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md),
  [`tour-based-explorer-prompt`](../tour-based-explorer-prompt/SKILL.md),
  [`sbtm-reference`](../sbtm-reference/SKILL.md).
- Consumed by:
  [`exploratory-charter-author`](../../agents/exploratory-charter-author.md).
