---
name: pii-masking-pipeline-builder
description: "Build-an-X workflow that owns the full detect → mask → verify pipeline for PII in test data. Walks the author through (1) classifying each field against the cross-regime PII catalog (GDPR / CCPA-CPRA / NIST SP 800-122 / HIPAA, in references/pii-categories.md), (2) picking a masking operator from the techniques catalog (seven canonical operators + Presidio operators + privacy models, in references/masking-techniques.md), (3) deciding pseudonymisation (reversible, in GDPR scope) vs anonymisation (irreversible, out of scope), (4) ordering the pipeline (detect → operator → audit) and emitting a deployable YAML config for Presidio + Faker + Synthea wrappers (Faker-as-masking-operator detail in references/faker-masking-operators.md), and (5) running the adversarial verification pass that re-detects PII in the masked output and blocks promotion on a leak. Use when non-production environments need masked production data - from field classification through runnable masking config to the leak audit."
---

# pii-masking-pipeline-builder

## Overview

Authoring a masking pipeline requires three classifications per
field (regulatory regime, operator, reversibility) and one global
decision (pipeline ordering + audit hooks). This workflow produces
a **deployable YAML spec** that downstream tools execute:

- `presidio-pii-detection`
  runs the detector.
- Faker substitution operators
  ([references/faker-masking-operators.md](references/faker-masking-operators.md)) /
  `synthea-healthcare-data`
  supply substitute values.
- The verification pass (below) audits the output for leaks.

## When to use

- Promoting a production-data snapshot to a staging environment.
- Building a recurring refresh pipeline that masks nightly.
- Establishing a per-table contract that PR-reviewers can audit.

## Step 1 - Inventory the source

Enumerate every column / field in the source dataset. For each,
record:

| Column | Type | Sample value | Cardinality | Cross-table join? |
|---|---|---|---|---|
| `users.email` | string | alice@acme.com | high | yes (joins `events`) |
| `users.ssn` | string | 123-45-6789 | high | no |
| `users.dob` | date | 1985-03-14 | medium | no |
| `users.zip` | string | 02139 | low | no |
| `users.country` | string | US | very low | no |

A schema introspector can produce the first columns; cardinality
and join graph need a quick analytical pass.

## Step 2 - Classify each field

Look up each column in the cross-regime catalog
([references/pii-categories.md](references/pii-categories.md))
and record which regulatory regime(s) apply. Include linkable
fields explicitly (NIST 800-122 §2.2).

| Column | GDPR | CPRA SPI | NIST | HIPAA | Risk |
|---|:---:|:---:|:---:|:---:|---|
| `users.email` | ✓ | - | ✓ | ✓ #6 | direct |
| `users.ssn` | ✓ | ✓ | ✓ | ✓ #7 | direct, high-sensitivity |
| `users.dob` | linkable | - | linkable | ✓ #3 | linkable |
| `users.zip` | linkable | - | linkable | ✓ #2 (sub-state) | linkable |
| `users.country` | - | - | - | - | non-PII |

Any field marked direct OR linkable enters the masking scope. A
field marked only "linkable" still gets masked because it
identifies in combination with others (Sweeney 87% rule, see
[references/pii-categories.md](references/pii-categories.md)).

## Step 3 - Pick an operator per field

Match each field to a technique in the techniques catalog
([references/masking-techniques.md](references/masking-techniques.md)).
Decision tree:

1. **Must round-trip for authorised consumer?** (e.g., payments)
   → Tokenisation (vault) or FPE.
2. **Must join across tables?** → Deterministic substitution or
   salted hash with consistent salt per source value.
3. **Continuous numeric needing analytics?** → Number variance.
4. **Categorical demographic for analytics?** → Generalisation +
   l-diversity.
5. **Free text potentially containing PII?** → Presidio detect →
   replace / redact.
6. **No analytical or operational use?** → Nulling / redaction.

| Column | Operator | Rationale | Reversible? |
|---|---|---|---|
| `users.email` | Faker substitution (deterministic via hash-seed) | Joins across tables; need referential integrity | Yes (via salt vault) |
| `users.ssn` | Tokenisation (vault) | Strict regulator scope; round-trip needed for auth | Yes (via vault) |
| `users.dob` | Generalisation to year | Analytics needs age bracket, not exact DOB | No |
| `users.zip` | Truncation to first 3 digits | HIPAA Safe Harbor #2 rule (>20k pop only) | No |
| `users.country` | Pass-through | Not PII | n/a |

## Step 4 - Pseudonymisation vs anonymisation gate

For each masked field, mark whether the result remains *personal
data* under GDPR Art. 4(5):

- Reversible techniques (deterministic substitution, tokenisation,
  encryption, salted hashing with retained salt) =
  **pseudonymised** → output is still personal data → masking
  pipeline output is still in GDPR scope.
- Irreversible techniques (random substitution, generalisation,
  nulling, redaction) = **anonymised** → potentially out of GDPR
  scope (subject to Recital 26 reasonable-likelihood test).

Document the gate decision per dataset:

```yaml
output_classification: pseudonymised  # GDPR scope retained
gdpr_lawful_basis: Article 6(1)(f) legitimate interests
retention: 90 days
access_control: only-dev-environment-team
```

vs.

```yaml
output_classification: anonymised
gdpr_lawful_basis: out-of-scope per Recital 26
retention: indefinite
access_control: open
```

The author cannot claim "anonymised" if any reversible technique
is in the pipeline.

## Step 5 - Compose the pipeline

A standard order:

1. **Schema-aware mask** - apply per-column operators from Step 3
   (deterministic, fast, no NER needed).
2. **Free-text detect + mask** - for any string column wider than
   ~50 characters, run
   `presidio-pii-detection`
   to catch embedded PII (e.g., a user-typed comment that contains
   an email).
3. **Audit hook** - sample N rows of output and run the
   verification pass (below) before
   declaring the run complete.
4. **Manifest** - emit a per-run manifest recording: pipeline
   version, source snapshot ID, row count in / out, operator
   versions, salt vault key version.

## Step 6 - Emit the YAML spec

Recommended shape - consumable by a generic pipeline runner:

```yaml
pipeline:
  name: users-staging-refresh
  source:
    type: postgres
    connection: $PROD_RO_DSN
    schema: public
    table: users
  classification:
    output: pseudonymised
    regimes: [gdpr, cpra, hipaa]
  fields:
    - column: email
      operator: deterministic_substitution
      provider: faker
      provider_method: internet.email
      seed_strategy: hash(salt + value)
      salt_ref: vault://masking/users.email
    - column: ssn
      operator: tokenisation
      vault: vault://masking/users.ssn
    - column: dob
      operator: generalisation
      params:
        granularity: year
    - column: zip
      operator: truncation
      params:
        keep_chars: 3
        from: start
    - column: country
      operator: passthrough
  free_text_columns:
    - notes
    - support_message
  free_text_detector:
    type: presidio
    language: en
    score_threshold: 0.45
    entities: [PERSON, EMAIL_ADDRESS, PHONE_NUMBER, US_SSN, CREDIT_CARD, IP_ADDRESS]
    on_detect: replace
  audit:
    sample_rows: 100
    fail_on_critic_block: true
  output:
    type: postgres
    connection: $STAGING_RW_DSN
    schema: public
    table: users
  manifest:
    write_to: s3://masking-manifests/${run_id}.json
```

## Step 7 - Worked example

A SaaS app refreshes its staging from prod nightly. Source has 4M
users with 22 columns, 3 of which are free-text. Synthesised spec:

```yaml
pipeline:
  name: prod-to-staging-nightly
  source: { type: postgres, table: users }
  classification: { output: pseudonymised, regimes: [gdpr, cpra] }
  fields:
    - { column: user_id, operator: passthrough }                  # internal opaque ID
    - { column: email, operator: deterministic_substitution,
        provider: faker, provider_method: internet.email,
        seed_strategy: hash(salt + value), salt_ref: vault://prod/email }
    - { column: full_name, operator: substitution,
        provider: faker, provider_method: name }
    - { column: phone, operator: substitution,
        provider: faker, provider_method: phone_number }
    - { column: address_line1, operator: substitution,
        provider: faker, provider_method: address }
    - { column: country, operator: passthrough }
    - { column: language, operator: passthrough }
    - { column: created_at, operator: passthrough }
    - { column: last_login_at, operator: passthrough }
    - { column: signup_ip, operator: encryption,
        params: { algo: fpe-ff1 }, key_ref: vault://prod/ip-fpe }
    - { column: notes, operator: free_text_mask }
  free_text_detector:
    type: presidio
    language: en
    score_threshold: 0.5
    on_detect: replace
  audit: { sample_rows: 100, fail_on_critic_block: true }
```

Pipeline classification: pseudonymised (email is deterministic,
IP is FPE-encrypted with key retained). The user explicitly
accepts that this output remains in GDPR scope.

## Verification pass - auditing the masked output

Every pipeline run ends with an adversarial leak audit that re-detects PII in
the masked output and challenges the pipeline's "clean" claim. Audit checklist:

1. **Sample the output.** N rows (default 1000) uniformly; 10 000+ for
   high-risk datasets: `shuf -n 1000 masked-users.csv > sample.csv`.
2. **Detect.** Re-run `presidio-pii-detection` against the sample with the
   strictest entity set and a **lower** `score_threshold` than the pipeline
   used during masking (e.g. 0.4 vs 0.5+) - the audit should catch hits the
   pipeline filtered out as low-confidence. Scan **every** column, including
   declared-non-PII passthrough columns.
3. **Cross-reference.** For each hit: was the column in the spec, and what
   operator ran? A hit in an unclassified or passthrough column is a leak
   unless the column is genuinely non-PII per
   [references/pii-categories.md](references/pii-categories.md). Was the
   operator appropriate per
   [references/masking-techniques.md](references/masking-techniques.md)?
   Did it silently fail (literal "NULL" string still detected)?
4. **Classify by regime.** Map each leak to its regulator(s) via the
   cross-jurisdiction table; a leak counts against every regime listing it.
5. **Verdict.**

```
BLOCK if any hit is:
  - A CPRA SPI / GDPR Art. 9 / HIPAA Safe Harbor identifier
  - A direct identifier in a column where the pipeline declared
    "anonymised" output
  - A hit in a column the pipeline didn't classify

PASS-WITH-CAVEATS if:
  - Only linkable (not direct) leaks remain
  - The pipeline output is declared "pseudonymised" (GDPR scope
    retained, so linkable hits are tolerable when access-controlled)

PASS if:
  - Zero hits, OR
  - Only false-positive hits that the analyst flags as
    Presidio-noise (e.g., a fake-shaped string that's actually a
    UUID)
```

The audit **refuses** to mark a run "pass" if any CPRA SPI / GDPR Art. 9 /
HIPAA Safe Harbor identifier appears unmasked, if the spec lacks a manifest
(no provenance = no audit trail), or on a "we'll fix it next time" promise -
leaks block the promotion. Findings are suppressed only via an explicit
per-row waiver. Re-audit on every pipeline-spec change; detection is
heuristic (Presidio's recogniser ceiling), so custom `PatternRecognizer`s
cover in-house ID formats and full-dataset scans replace sampling for
comprehensive audits.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Per-column operator without referential check | Joins break after masking | Group columns that share keys; apply deterministic operators consistently |
| Free-text columns skipped | Embedded PII (user-typed emails) leaks | Always run Presidio on any string column > ~50 chars |
| Claiming "anonymised" when any reversible op is in the pipeline | False GDPR compliance claim | Audit the pipeline; pseudonymised if any operator is reversible |
| No audit step | Operator failure or recogniser drift goes unnoticed | Always sample output and run the verification pass |
| Salt vault key shared across pipelines | Salt-rotation breaks every downstream pipeline at once | Per-pipeline salt; rotate independently |
| No manifest | Cannot reproduce a past run; auditors can't trace lineage | Always emit manifest with version IDs |
| Pipeline runs on prod-write connection | Risk of writing masked data back over prod | Strict source = read-only DSN; output = staging-write DSN |

## Limitations

- **No automated regime mapping.** The author must classify each
  field against the regimes (Step 2) - the tool doesn't infer it.
- **Pipeline runners vary.** This skill emits a generic YAML; the
  team needs a runner (custom Python / dbt / Spark job / commercial
  tool) to execute it.
- **Free-text detection is heuristic.** False positives + negatives
  are real (see
  `presidio-pii-detection`
  limitations).
- **Doesn't cover application-layer PII generation.** A pipeline
  masks data at rest; the application might still write fresh PII
  to logs at runtime - pair with log-masking middleware.

## References

- Cross-regime PII catalog (GDPR / CCPA-CPRA / NIST / HIPAA citations):
  [references/pii-categories.md](references/pii-categories.md), with full
  per-regime enumerations in
  [references/regime-catalogs.md](references/regime-catalogs.md).
- Masking-operator catalog (ISO/IEC 20889 + Presidio citations):
  [references/masking-techniques.md](references/masking-techniques.md), with
  privacy models in
  [references/privacy-models.md](references/privacy-models.md).
- Faker as a masking substitution operator (seed-exposure matrix):
  [references/faker-masking-operators.md](references/faker-masking-operators.md).
  Fixture-style fake data built from nothing lives in the `qa-test-data`
  plugin's `faker-data` skill.
- Composes:
  `presidio-pii-detection`,
  `synthea-healthcare-data`.
- GDPR Art. 4(5) pseudonymisation - 
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/).
- NIST SP 800-188 privacy models - 
  [csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final).
