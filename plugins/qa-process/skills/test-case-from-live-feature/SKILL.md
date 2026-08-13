---
name: test-case-from-live-feature
description: "Build-an-X workflow that produces a test-case matrix from a **live, undocumented feature** - running app at a URL, screen recording, screenshot, or verbal brief - by combining structured exploration (Playwright trace / DevTools / accessibility tree) with the four canonical heuristic test-design models bundled in references/ (Bach's HTSM / SFDPOT product elements, Whittaker's How-to-Break-Software attacks, Bolton's FEW HICCUPPS consistency oracles, ISO/IEC 25010 quality characteristics). Output is a structured case matrix, not an exploratory session charter. Use when there is no story, no AC, and no documentation - only a live feature - or as the heuristic reference layer for zero-documentation test design."
---

# test-case-from-live-feature

## Overview

A tester is told "test the new checkout flow" with no story, no AC, no design doc, but the feature is deployed to staging. The right path is to **reverse-engineer a test-case matrix from the live feature**, anchored on the four heuristic models in [references/heuristics.md](references/heuristics.md), and emit a structured matrix that downstream skills (`manual-test-script-author`, `gherkin-from-stories`, `ai-test-generator`) can consume.

The output is the same shape as `test-case-ideation-from-story` - one row per case with `id / title / tier / precondition / steps / expected / source claim` - but the `source claim` column points at *observed behaviour* rather than a *story sentence*, and each row is tagged with the heuristic that surfaced it so the team can audit the coverage logic.

## When to use

- A feature is deployed (staging / canary / prod) but has no written spec.
- A legacy / brownfield area has no test coverage and you need to start from the running app.
- A competitor's product is under review (security audit, market research).
- A spec exists but is thin - combine the spec-driven matrix with this skill's heuristic supplement.
- A team has documented the feature in code only (the code is the spec) and you need to derive cases from the implementation.

Do **not** use this skill when:

- A written story / AC exists - use `test-case-ideation-from-story` (faster and more traceable to source).
- The feature is not yet deployed (no running surface to probe) - escalate the documentation gap; heuristic test design without **any** observable surface is divination, not testing.
- The task is open-ended exploration / learning - produce a session charter instead.

## Step 1 - Probe the live feature

Capture concrete observations from the running surface. Sources, in order of preference:

| Source | What to capture | Tool |
|---|---|---|
| **Live URL / app** | All visible actions, fields, validation messages, error states; the URL pattern; the network requests; the rendered DOM | Browser DevTools, Playwright trace, axe-core accessibility tree |
| **Screen recording / Loom** | The flow the engineer / PM walked through; the implicit assumptions about state | Annotate the recording with timestamps |
| **Screenshot set** | Static state; what fields exist; what labels say | Inspect element labels and ARIA |
| **Verbal brief from an engineer** | "It does X and Y" - capture *as a quote*, do not transcribe as fact | Mark as `[verbal, unconfirmed]` |
| **Existing code (the spec-in-code case)** | Public API surface, route definitions, validation rules, DB schema | `git log` to see recent change scope |

Output of Step 1 is an **observation log**:

```markdown
## Observation log - checkout flow @ staging.example.com (2026-05-11 14:00 UTC)

### URLs probed
- `/cart` - cart view; lists line items.
- `/cart/checkout` - multi-step flow: address → shipping → payment → review → confirm.
- `/cart/confirm/:order_id` - confirmation page.

### Network calls observed
- `POST /api/cart/items` (add to cart) → 201, body `{ sku, qty, addedAt }`.
- `POST /api/coupons/apply` → 200 on valid, 409 on already-applied, 422 on expired.
- `POST /api/checkout/payment` → 201 on success, 402 on declined, 5xx on provider-down.

### UI affordances observed
- Coupon field accepts up to 32 chars; case-insensitive in client validation (DOM `text-transform: uppercase`).
- "Place order" button disabled on submit (good - prevents double-click).
- No client-side qty boundary; server returns 422 above qty=99.

### Accessibility tree (axe-core)
- 3 violations on /cart/checkout: missing label on shipping-method radios; insufficient contrast on disabled button; missing live-region on validation errors.

### Verbal brief (engineer Slack message, 2026-05-10)
- "It uses Stripe for cards and PayPal for wallets, and we have a feature flag `new_checkout_v2` defaulting on." [verbal, unconfirmed]
```

Inputs that **cannot** be confirmed by direct observation are tagged `[verbal, unconfirmed]` or `[claim, unverified]` and tracked through the matrix as `source claim: observation + [unverified]`. This is the audit trail that lets the team disambiguate "tester observed" from "tester was told."

## Step 2 - Walk the heuristic models

Apply each model in [references/heuristics.md](references/heuristics.md) to the observation log, in order:

- **2a - SFDPOT coverage walk**: enumerate cases per Product Element (Structure, Function, Data, Platform, Operations, Time); each non-empty cell becomes one or more rows.
- **2b - Whittaker attack overlay**: for each function, apply input / UI / stored-data / computation / configuration / output attacks.
- **2c - FEW HICCUPPS oracle pre-flight**: for each observation that already looked wrong, name the consistency lens so the row carries a defensible verdict frame.
- **2d - ISO 25010 quality cross-check**: add rows for the quality dimensions (performance, security, usability, reliability) that SFDPOT did not surface.

The full walk applied to the checkout observation log - the SFDPOT table, the per-function Whittaker attacks, the FEW HICCUPPS pre-flight, and the ISO 25010 cross-check - is in [references/heuristic-walk-example.md](references/heuristic-walk-example.md).

## Step 3 - Emit the matrix

Same shape as `test-case-ideation-from-story` output, with two added columns:

| Column | Notes |
|---|---|
| **ID** | `<feature>-LIVE-<n>`, e.g. `CHECKOUT-LIVE-03`. The `LIVE` infix marks it as heuristically-derived. |
| **Title** | Imperative single sentence. |
| **Tier** | `smoke` / `regression` / `edge` / `negative` / `a11y` / `perf` / `sec`. |
| **Precondition** | Observed (or `[unverified - confirm with PM]`). |
| **Steps** | Numbered, declarative (per [Cucumber better-Gherkin](https://cucumber.io/docs/bdd/better-gherkin/)). |
| **Expected** | Observed behaviour or the FEW HICCUPPS-derived expectation. |
| **Source claim** | Observation log line + heuristic that surfaced the case (e.g., `obs:cart.qty boundary @ DevTools; Whittaker input-attack`). |
| **Heuristic** *(new)* | Which model surfaced this: `SFDPOT-F`, `Whittaker-input`, `FEW-HICCUPPS-comparable-products`, `ISO25010-security`, etc. |
| **Confidence** *(new)* | `observed` (saw it directly), `inferred` (heuristic surfaced it but not yet probed), `verbal-unverified` (came from a non-canonical source). |

### Worked example row

| ID | Title | Tier | Pre | Steps | Expected | Source claim | Heuristic | Confidence |
|---|---|---|---|---|---|---|---|---|
| CHECKOUT-LIVE-07 | Rejects coupon when length exceeds 32 chars | negative | Authenticated session | 1. Open `/cart/checkout`. 2. Enter coupon of 33 chars. 3. Submit. | Either client validation blocks at 32; or server returns 422. Both behaviours are defensible - observe which the team chose and document. | `obs:coupon-input maxlength=32 in DOM`; Whittaker input-attack | Whittaker-input | inferred |
| CHECKOUT-LIVE-08 | Idempotent re-POST on /api/checkout/payment | regression | Authenticated session; payment about to submit | 1. Submit payment. 2. Network-throttle the response. 3. Re-submit with the same idempotency key. | Returns the original order id, does not charge twice. | `obs:idempotency-key header observed`; FEW HICCUPPS-purpose | FEW-HICCUPPS-purpose | inferred |
| CHECKOUT-LIVE-09 | Shipping-method radios have accessible labels | a11y | Authenticated session, address completed | 1. Inspect shipping-method radios. 2. Verify each has an associated `<label>` or `aria-label`. | Each radio has an accessible name; screen reader announces it. | `obs:axe-core violation @ /cart/checkout`; ISO25010-usability; WCAG 2.2 AA | ISO25010-usability | observed |

Confidence-tagged rows give the team an explicit gradient: `observed` cases can be run immediately; `inferred` cases are the heuristic's prediction the team should confirm-or-falsify on first run; `verbal-unverified` cases need product-side validation before they go into the regression suite.

## Step 4 - Reconcile with downstream skills

The matrix is the input to the same downstream chain as `test-case-ideation-from-story`:

1. Cases the team wants to **execute manually** → `manual-test-script-author`.
2. Cases the team wants to **convert to Gherkin** → `gherkin-from-stories` (qa-bdd plugin, manual-step mode).
3. Cases the team wants to **automate as E2E** → author E2E test scaffolds.
4. Cases the team wants to **audit before committing to the suite** → run a quality audit of the matrix.

The matrix should also be filed with the team's PM / engineer as a **documentation byproduct** - the heuristic walk often surfaces things the team didn't realise were unspecified, and the matrix becomes the de facto spec for the feature going forward.

## Step 5 - Tracker / test-management integration

Per the same conventions as `test-case-ideation-from-story`: import as CSV into TestRail / Qase / Xray; preserve the `Heuristic` and `Confidence` columns as tags so the team can filter "all SFDPOT-F-derived smoke cases" or "all `inferred` cases awaiting first-run confirmation."

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skipping the observation log; jumping straight to heuristic walk | Without the observation log, the matrix's "source claim" column is empty - the team cannot audit which case came from where. | Step 1 produces the observation log first; it is the load-bearing artifact. |
| Treating `inferred` rows as authoritative | Heuristics generate hypotheses, not facts; an `inferred` row that doesn't reproduce is the heuristic doing its job. | The Confidence column gates downstream automation - `inferred` cases are probed on first run, not blindly automated. |
| Filing FEW HICCUPPS-derived bugs without naming the lens | The bug report reads "this feels wrong" - undefensible. | Always cite the lens (e.g., `FEW-HICCUPPS: Comparable-products + User-expectations`). |
| Transcribing the engineer's verbal brief as fact | The brief is the engineer's mental model; mental models leak. | Tag verbal input `[verbal, unconfirmed]` and probe it against the live surface in Step 1. |
| Running this skill on a feature that already has a story | The story-driven path (`test-case-ideation-from-story`) is faster and more traceable when a story exists. | Use this skill only when no story / AC / spec exists; combine with the story-driven matrix for thin specs. |
| Probing production directly (instead of staging / canary) | Side effects on real users, real data, real money. | Step 1's "live URL" means staging / canary by default; production probes require a separate authorisation. |

## Limitations

- **Coverage breadth is bounded by the observation log.** A feature with hidden code paths not reachable from the UI will not surface them unless a network-call observation or code probe reveals them; and a shallow probe (walking SFDPOT without knowing the domain) yields shallow output. The skill is scaffolding for domain reasoning, not a replacement.
- **`inferred` cases can be wrong.** A heuristic that predicts a 422 on length-overflow when the server actually returns a 500 is a finding - the row updates to `observed` after first run, so inferred rows are probed before they enter the regression suite.

## Hand-off targets

- **Manual execution script** → `manual-test-script-author`.
- **Gherkin scenarios** → `gherkin-from-stories` (qa-bdd plugin; covers manual-step input too).
- **Negative / boundary expansion of the cases** → `negative-test-generator`, `boundary-value-generator`.
- **When a written spec arrives mid-flow** → switch upstream to `test-case-ideation-from-story` and merge the two matrices.

## References

- [references/heuristics.md](references/heuristics.md) - the bundled catalog of HTSM / SFDPOT / Whittaker / FEW HICCUPPS / ISO 25010 this skill consumes.
- James Bach - Heuristic Test Strategy Model: https://www.satisfice.com/download/heuristic-test-strategy-model
- Michael Bolton - DevelopSense (FEW HICCUPPS, exploratory testing): https://developsense.com/
- Exploratory testing - Kaner's 1984 definition; Whittaker "How to Break Software" attack catalog: https://en.wikipedia.org/wiki/Exploratory_testing
- ISO/IEC 25010 - quality characteristics: https://en.wikipedia.org/wiki/ISO/IEC_25010
- Cucumber documentation - Better Gherkin (declarative phrasing for the `Steps` column): https://cucumber.io/docs/bdd/better-gherkin/
- ISTQB glossary - test case: https://glossary.istqb.org/en_US/term/test-case
- ISTQB glossary - exploratory testing: https://glossary.istqb.org/en_US/term/exploratory-testing
