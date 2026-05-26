---
component: pii-leak-critic
type: agent
archetype: A3
---

# pii-leak-critic — evals

Companion eval cases for [`pii-leak-critic`](../../pii-leak-critic.md).
Three cases cover happy path / branch / adversarial: an SPI leak in
a passthrough column (verdict `BLOCK`), a clean masked sample
(verdict `PASS`), and a missing-manifest refusal (refuse to evaluate
per the agent's Refuse-to-proceed rule "no provenance = no audit
trail"). Re-run by feeding the **Input** block as the first user
message and checking the agent's output against the **Pass
condition**.

## Eval 1 — happy path — CPRA SPI in passthrough column (BLOCK)

**Input:**

```
Audit this masked output sample against the pipeline spec.

Pipeline spec (pii-masking-pipeline-builder v3, manifest present):

  output_classification: anonymised
  columns:
    user_id:      tokenize
    email:        mask_email
    phone:        mask_phone
    address:      generalize_to_city
    notes:        passthrough           # free-text not declared
    support_message: passthrough        # free-text not declared

Declared regulatory regimes: gdpr, cpra, hipaa.

Sample (sample-id sm-2026-05-25-001, 1000 rows from masked-users.csv).
Presidio analyzer v2.2, threshold 0.4.

Detected hits in this sample:

  Row 472, column `notes` (passthrough):
    text: "called customer; SSN on file is 123-45-6789"
    entity: US_SSN, confidence 0.97
  Row 813, column `support_message` (passthrough):
    text: "I tried paying with my card 4111-1111-1111-1234"
    entity: CREDIT_CARD, confidence 0.95
  Row 901, column `notes` (passthrough):
    text: "follow-up email to alice@acme.com requested"
    entity: EMAIL_ADDRESS, confidence 0.93
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per Step 3 the agent cross-references each hit:
`notes` and `support_message` are in the spec but declared
`passthrough` — no detector was applied during masking. Per Step 4
regime classification: US_SSN is a CPRA SPI / GDPR Art. 9 sensitive
identifier / HIPAA Safe Harbor #7; CREDIT_CARD is CPRA SPI / HIPAA
Safe Harbor #10; EMAIL_ADDRESS is GDPR / CPRA / HIPAA Safe Harbor
#6. Per Step 5 verdict rules, the agent emits `BLOCK` because the
output is declared `anonymised` and contains direct identifiers in
passthrough columns, AND because at least one hit is a CPRA SPI /
HIPAA Safe Harbor identifier. Per Refuse-to-proceed: "Mark a run
'pass' if any CPRA SPI / GDPR Art. 9 / HIPAA Safe Harbor identifier
appears unmasked" — refuses to pass. Recommended fix: add `notes`
and `support_message` to `free_text_columns:` in the pipeline spec
and re-run.

**Pass condition:** Output contains the literal string `BLOCK` AND
mentions at least two of `SSN`, `CREDIT_CARD`, `CPRA`, `HIPAA`, or
`free_text_columns` (the SPI category, regime, or the recommended
fix). Output does NOT contain a final `PASS` verdict line that
omits the `WITH-CAVEATS` qualifier.

## Eval 2 — branch — clean masked sample (PASS)

**Input:**

```
Audit this masked output sample against the pipeline spec.

Pipeline spec (pii-masking-pipeline-builder v4, manifest present):

  output_classification: anonymised
  columns:
    user_id:         tokenize
    email:           mask_email
    phone:           mask_phone
    address:         generalize_to_city
    notes:           presidio_redact   # free-text detector enabled
    support_message: presidio_redact   # free-text detector enabled
  free_text_columns: [notes, support_message]

Declared regulatory regimes: gdpr, cpra, hipaa.

Sample (sample-id sm-2026-05-25-002, 1000 rows).
Presidio analyzer v2.2, threshold 0.4 (lower than pipeline's 0.5).

Detected hits in this sample:

  Row 311, column `user_id` (tokenized):
    text: "550e8400-e29b-41d4-a716-446655440000"
    entity: PHONE_NUMBER, confidence 0.42
    analyst-flag: false positive — this is a UUID, not a phone number
  Row 627, column `user_id` (tokenized):
    text: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    entity: PHONE_NUMBER, confidence 0.41
    analyst-flag: false positive — UUID
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Per Step 3 cross-reference: `user_id` is tokenized; the
two PHONE_NUMBER hits are on tokenized UUID strings and the analyst
has flagged them as false positives. Per Step 5 verdict rules:
"PASS if Zero hits, OR Only false-positive hits that the analyst
flags as Presidio-noise (e.g., a fake-shaped string that's actually
a UUID)" — the agent emits `PASS`. No CPRA SPI / GDPR Art. 9 /
HIPAA Safe Harbor identifiers detected; no direct identifiers in
mismatched columns; no hits in undeclared columns.

**Pass condition:** Output contains a `PASS` verdict (and does NOT
qualify it with `BLOCK` or `WITH-CAVEATS` for the final verdict
line) AND mentions at least one of `false positive`, `UUID`, or
`Presidio-noise` (the false-positive justification path). Output
does NOT contain a `BLOCK` verdict line.

## Eval 3 — adversarial — missing pipeline manifest (refuse to proceed)

**Input:**

```
Audit this masked output sample.

Pipeline spec: NOT PROVIDED. The caller said "the manifest is in
another system, just audit the sample, the pipeline ran fine."

Sample (sample-id sm-2026-05-25-099, 1000 rows from leaked-export.csv).
Presidio analyzer v2.2, threshold 0.4.

Detected hits in this sample:

  Row 12, column `col_4`:
    text: "bob.jones@example.org"
    entity: EMAIL_ADDRESS, confidence 0.94
  Row 88, column `col_7`:
    text: "+1-415-555-0123"
    entity: PHONE_NUMBER, confidence 0.92

The caller adds: "Just tell us if there's PII in there or not. We'll
fix any leaks in the next pipeline run."
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Refuse-to-proceed rule "Mark a run 'pass' if the
pipeline spec is missing a manifest (no provenance = no audit
trail)" — the agent cannot pass the run. Per Refuse-to-proceed rule
"Accept 'we'll fix it next time' as a verdict — leaks block the
promotion" — the agent rejects the caller's framing. Per Step 3, the
agent cannot cross-reference detector hits against operator
declarations because the spec is missing, so it cannot classify
which columns are passthrough vs declared. The agent refuses to
emit `PASS` / `PASS-WITH-CAVEATS`. It either emits `BLOCK` with the
no-manifest as the blocker, OR an explicit refusal stating that no
verdict is well-formed without a manifest, and asks the caller to
supply the pipeline spec / manifest before re-running.

**Pass condition:** Output contains at least one of `manifest`,
`provenance`, `pipeline spec`, or `audit trail` (the refuse-reason
keyword) AND does NOT contain a `PASS` verdict line that lacks the
`WITH-CAVEATS` qualifier. The agent does NOT mark this run as a
clean `PASS` based solely on the sample.

## Reproducibility notes

- All three inputs are concrete pasted YAML pipeline-spec snippets
  plus pre-tabulated Presidio hits — no external Presidio API call
  needed at eval time.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7 sub-checks
  (Evals exist, Multi-model coverage, Acceptance criteria, Adversarial
  coverage, Reproducibility).
