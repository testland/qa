---
component: exploratory-charter-author
type: agent
---

# exploratory-charter-author - evals

Companion eval cases for [`exploratory-charter-author`](../../exploratory-charter-author.md).
Three cases cover happy path / branch / adversarial: a new-feature
charter (promo-code apply flow), a bug-cluster charter (Stripe webhook
incident), and a missing-mission refusal. Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - charter for a new feature (promo-code apply flow)

**Input:**

```
Author an SBTM-style charter card for an exploratory session on this
new feature.

Story: LIN-1234 — Apply promo at checkout
Spec excerpt: "Users can enter a promo code at the checkout page.
Valid codes apply a discount (% off or $ off, or free shipping). Codes
have expiration timestamps. One promo per order. Stacking with
existing discounts is allowed except for free-ship + $-off."

Target build / SHA: v1.4.5 / abc1234 on staging.
Time-box preference: 90 min (default).
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 1 frames a mission of pattern "New feature" - one
sentence telling the tester what to **learn** (not "test the feature"
and not "verify promo codes apply"). Step 2 emits 3-7 areas - promo
input field, discount math, multi-promo interaction, expiration timing
are the natural areas from the spec. Time-box stays at 90 min. Step 3
declares the PROOF debrief as a required deliverable, pointing at
`manual-test-debrief`. Step 4 emits the canonical charter card markdown
including Mission / Created from / Target build / Time-box / Areas /
Suggested tours / Deliverables / Out of scope / Session log / Sign-off
with the three-bucket time accounting (design / setup / bug
investigation).

**Pass condition:** Output contains the literal string `Mission:` AND
`PROOF` AND `90 min` (or `90 minutes`) AND `Out of scope`. Output
contains the heading `## Areas` with 3-7 list items beneath it.
Output mentions `manual-test-debrief` (the named PROOF deliverable).
Output does NOT contain `expect(`, `it('`, or any scripted-test
syntax - the agent must not collapse a charter into a script.

## Eval 2 - branch - bug-cluster charter (Stripe webhook incident)

**Input:**

```
Author an SBTM-style charter card for an exploratory session on this
bug cluster.

Incident: INC-2026-0042 — Stripe webhook handler — out-of-order
delivery + retries caused duplicate fulfilment in 3 orders last week.
The webhook-replay incident postmortem is at docs/postmortems/2026-04-
stripe-webhooks.md.

Target build / SHA: v1.5.0 / def5678 on staging.
Time-box preference: not specified.

(Note: this same area was last explored 6 weeks ago with a different
mission — usability of webhook diagnostics dashboard, PROOF debrief at
docs/sessions/2026-04-12-webhook-diagnostics.md. The new exploration
has a different mission, so duplicate-area refusal does NOT apply.)
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Step 1 frames a mission of pattern "Bug cluster / risk
area" - the mission references the postmortem and focuses on retry /
out-of-order delivery. Step 2 emits 3-7 areas centered on the webhook
handler surface (signature validation, idempotency keys, retry
semantics, ordering across event types). Time-box defaults to 90 min
(the prompt left it unspecified; the agent's default applies). Step 3
declares the PROOF debrief as a required deliverable. The charter
acknowledges the prior session but justifies the new mission as
non-duplicate (different focus area within the same surface). The
agent does NOT collapse into the new-feature mission pattern from
eval 1.

**Pass condition:** Output contains the literal string `Mission:` AND
mentions `webhook` AND mentions `retry` or `out-of-order` or
`idempotency` (the bug-cluster-specific framing). Output contains
`PROOF` AND `Out of scope`. Output does NOT contain `Apply promo` /
`promo code` (cross-contamination from eval 1's example wording would
indicate the agent copy-pasted the worked example instead of
authoring fresh).

## Eval 3 - adversarial - no mission, just "test the feature" (refuse)

**Input:**

```
Author a charter for the new dashboard. Just test it generally — see
what breaks. Set time-box to 4 hours so we get a thorough pass in one
sitting.

(No story / spec / diff / incident reference. No specific risk area.
No mission stated — "test it generally" is the entire framing.)
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to author the charter. Two refuse rules fire
together: (a) "Author a charter without a mission - 'Explore X' is not
a mission; it's a target. Mission must say what to **learn**" - "test
it generally" is a target, not a mission; and (b) "Set a time-box >120
minutes" - 4 hours = 240 min, well past the 120 min cap. The agent
requests the missing mission framing and proposes splitting into
multiple charters under 120 min each. Does NOT emit a full charter
card with the requested fields filled in. Does NOT silently shorten
the time-box to 90 min and proceed; the missing-mission rule is the
controlling refusal.

**Pass condition:** Output asks for the mission (contains the word
`mission` or `learn` framed as a request / clarifying question).
Output mentions the 120-minute cap (contains `120` AND `minutes` or
`min`). Output does NOT contain a fully-populated charter card
heading `# Charter` followed by a populated `**Mission:**` line.
Output does NOT contain `4 hours` / `240 min` as an accepted
time-box.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo. The cross-reference to
  the prior session in eval 2 is given inline as a note, so the agent
  does not need to fetch a real postmortem file.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Write`, `Grep`, `Glob`) writes
  the charter card as markdown - eval 3 is observable as the absence
  of a populated `# Charter` heading plus the explicit clarifying
  request.
- Eval cases were authored 2026-05-26 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
