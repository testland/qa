---
component: spec-to-suite-orchestrator
type: agent
---

# spec-to-suite-orchestrator - evals

Companion eval cases for [`spec-to-suite-orchestrator`](../../spec-to-suite-orchestrator.md).
Three cases cover happy path (full 5-stage chain runs for a payment-with-auth
spec, exercising both optional Stage 3 sub-extractors), branch (data-product
spec triggers only the data-contract sub-extractor; threat-model is skipped),
and adversarial (testability-reviewer returns BLOCK - refuse to proceed past
Stage 1). Re-run by feeding the **Input** block as the first user message
and checking the agent's transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates below are the eval-authoring date - each case
is designed to be reproducible against any tier.

## Eval 1 - happy path - payment + auth spec (both sub-extractors run)

**Input:**

```
Run the shift-left orchestration for this dev-ready story.

Story ID: CHK-412
Spec (inlined; pretend this is `docs/specs/CHK-412/spec.md`):

  Title: Saved-card checkout for logged-in shoppers

  Background:
  - Logged-in shoppers (session cookie present) currently re-enter card
    details every purchase.
  - After this change, logged-in shoppers see a "Pay with saved card"
    button if they have at least one card saved at Stripe.

  Acceptance:
  - Given a logged-in shopper with >= 1 saved card, when they reach the
    checkout page, they see a "Pay with saved card" CTA.
  - Clicking the CTA initiates a Stripe charge against the default
    saved card.
  - 3DS authentication is invoked if Stripe requires it.

  NFRs:
  - The page must render in under 1500 ms (LCP).
  - The CTA must be keyboard-reachable and announced by screen readers
    as "Pay with saved card".

  Touches: src/auth/session.ts, src/checkout/saved-card-cta.tsx,
           src/payments/stripe-saved-cards.ts.

testability-reviewer pre-run verdict: OK
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Stage 1 reads the testability-reviewer verdict `OK` →
proceed. Stage 2 runs `acceptance-criteria-extractor` (3 scenarios:
saved-card visible, charge initiated, 3DS invoked) AND `nfr-extractor`
(LCP < 1500 ms, a11y screen-reader announcement) in parallel. Stage 3
detects the trigger phrases `auth`, `session`, `payment`, `Stripe` →
runs `threat-model-from-spec`. The same stage detects no
`dataset` / `dbt model` / `ETL` / `data product` phrasing → does NOT
run `data-contract-extractor`. Stage 4 generates failing test stubs
via `bug-repro-builder` and pairs the perf NFR with
`lighthouse-perf`, the a11y NFR with `axe-a11y`. Stage 5 writes the
bundle to `docs/specs/CHK-412/`. The output's Stage table shows
`3a` ran and `3b` skipped.

**Pass condition:** Output contains the substring `OK` (Stage 1
verdict) AND mentions all of `acceptance-criteria-extractor`,
`nfr-extractor`, `threat-model-from-spec`, `bug-repro-builder`. Output
explicitly skips `data-contract-extractor` (substring `data-contract`
appears with `skip` / `skipped` / `not run` nearby, OR `data-contract`
does not appear in the executed-stages list). Output pairs the perf
NFR with `lighthouse-perf` (substring match) AND the a11y NFR with
`axe-a11y` (substring match). Output mentions writing to
`docs/specs/CHK-412/`.

## Eval 2 - branch - data-product spec (data-contract runs, threat-model skipped)

**Input:**

```
Run the shift-left orchestration for this dev-ready story.

Story ID: DATA-87
Spec (inlined):

  Title: New `daily_active_users` dbt model

  Background:
  - The analytics team needs a `daily_active_users` table refreshed
    nightly by a dbt model derived from the existing `events` source.

  Acceptance:
  - Given the events source has at least 1 row for the day, when the
    nightly dbt run completes, then `daily_active_users` has exactly
    one row per (date, product_id) pair.
  - Users active in multiple products on the same day appear once per
    product.
  - The model is rebuilt incrementally based on `event_date`.

  NFRs:
  - The nightly job completes within 20 minutes.
  - Data freshness: `loaded_at` must be < 6h old at 09:00 UTC.

  Data contract:
  - Columns: event_date (DATE), product_id (BIGINT), dau (BIGINT).
  - Primary key: (event_date, product_id).
  - Source dataset: `events` (loaded by Fivetran from Segment).

  Touches: dbt-project/models/marts/daily_active_users.sql.

testability-reviewer pre-run verdict: OK
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Stage 1: OK → proceed. Stage 2: AC extractor (3 scenarios)
+ NFR extractor (20-min job duration, 6h freshness). Stage 3 detects
trigger phrases `dataset`, `dbt model`, `data product` → runs
`data-contract-extractor`. The spec mentions no `auth` / `login` /
`session` / `payment` / `file upload` / `PII` / `third-party
integration` → `threat-model-from-spec` is NOT triggered. Stage 4 stubs
pair the freshness NFR with `data-quality-gate` (NOT
`lighthouse-perf` - wrong NFR family). Stage 5 writes the bundle to
`docs/specs/DATA-87/`.

**Pass condition:** Output mentions `data-contract-extractor` as
running. Output explicitly skips `threat-model-from-spec` (substring
`threat-model` appears with `skip` / `skipped` / `not run` nearby OR
`threat-model` is absent from the executed-stages list). Output pairs
the freshness NFR with `data-quality-gate` (substring match). Output
does NOT pair this story's NFRs with `axe-a11y` or
`visual-baseline-gate` (wrong NFR families). Output mentions writing
to `docs/specs/DATA-87/`.

## Eval 3 - adversarial - Stage 1 BLOCK (refuse to proceed)

**Input:**

```
Run the shift-left orchestration for this dev-ready story.

Story ID: VAGUE-1
Spec (inlined):

  Title: Make checkout faster

  Background:
  - Checkout feels slow. We should fix this.

  Acceptance:
  - Checkout is faster.
  - Users report fewer complaints.
  - The system feels responsive.

  NFRs: TBD

  Touches: src/checkout/* (TBD which files).

testability-reviewer pre-run verdict: BLOCK
  - "Faster" has no threshold (no LCP/TTFB/p95 target).
  - "Fewer complaints" is not observable from code.
  - "Feels responsive" is subjective; not testable.
  - "TBD" file scope.

(Note: the BLOCK verdict comes from the testability-reviewer; the
orchestrator must honour it.)
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Stage 1's rule ("BLOCK - STOP. Emit findings; refuse
to proceed. Untestable claims poison every downstream artifact") and
the Refuse-to-proceed section ("Skipping Stage 1 - every chain run
starts with the testability gate; no override flag"), the orchestrator
refuses to run Stages 2-5. Output does NOT invoke
`acceptance-criteria-extractor`, `nfr-extractor`,
`threat-model-from-spec`, `data-contract-extractor`, or
`bug-repro-builder`. Output does NOT write a `docs/specs/VAGUE-1/`
bundle. Output surfaces the testability-reviewer's findings (no
threshold, unobservable, subjective, TBD scope) and recommends
returning the spec to the author.

**Pass condition:** Output contains the literal string `BLOCK` (the
verdict from Stage 1). Output does NOT contain `acceptance-criteria-extractor`
as a stage that actually ran (it may be named only as "did not run"
/ "skipped"). Output does NOT mention writing files under
`docs/specs/VAGUE-1/`. Output mentions returning the spec to the
author / re-running after fixes (substring `author` OR `re-run` OR
`return` OR `untestable`).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (spec text +
  testability-reviewer pre-run verdict). No external Slack / Notion
  / Figma fetch needed - Limitations explicitly call out that the
  agent needs a fetched copy, so inlining matches that contract.
- Pass conditions are literal-string checks against the orchestrator's
  output table + prose; a reviewer can grep the transcript for each
  substring.
- The agent's tool surface (`Read`, `Write`, `Edit`, `Grep`, `Glob`,
  `Bash(npm test *)`, `Bash(npx playwright test *)`) lets it
  write bundle files and re-run stubs, but every Bash invocation is
  scoped to known runners. Eval re-runs cannot push commits or
  modify production code.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
