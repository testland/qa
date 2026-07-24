---
name: pii-masking-pipeline-builder
description: "Build-an-X workflow that produces a PII masking pipeline spec from a source-data inventory. Walks the author through (1) classifying each field against pii-categories-reference, (2) picking a masking operator from data-masking-techniques-reference, (3) deciding pseudonymisation (reversible, in GDPR scope) vs anonymisation (irreversible, out of scope), (4) ordering the pipeline (detect → operator → audit), and (5) emitting a deployable config for Presidio + Faker + Synthea wrappers. Output is a YAML pipeline spec plus a per-field rationale table. Use after classifying a dataset's PII risk; this is the workflow that translates classification into runnable masking config."
---

# pii-masking-pipeline-builder

## Overview

Authoring a masking pipeline requires three classifications per
field (regulatory regime, operator, reversibility) and one global
decision (pipeline ordering + audit hooks). This workflow produces
a **deployable YAML spec** that downstream tools execute:

- `presidio-pii-detection`
  runs the detector.
- `faker-synthetic-data` /
  `synthea-healthcare-data`
  supply substitute values.
- A leak-detection audit checks the output.

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

Look up each column in
`pii-categories-reference`
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
`pii-categories-reference`).

## Step 3 - Pick an operator per field

Match each field to a technique in
`data-masking-techniques-reference`.
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
3. **Audit hook** - sample N rows of output and run a
   leak-detection audit before
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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Per-column operator without referential check | Joins break after masking | Group columns that share keys; apply deterministic operators consistently |
| Free-text columns skipped | Embedded PII (user-typed emails) leaks | Always run Presidio on any string column > ~50 chars |
| Claiming "anonymised" when any reversible op is in the pipeline | False GDPR compliance claim | Audit the pipeline; pseudonymised if any operator is reversible |
| No audit step | Operator failure or recogniser drift goes unnoticed | Always sample output and run a leak-detection audit |
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

- Composes:
  `pii-categories-reference`,
  `data-masking-techniques-reference`,
  `presidio-pii-detection`,
  `faker-synthetic-data`,
  `synthea-healthcare-data`.
- GDPR Art. 4(5) pseudonymisation - 
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/).
- NIST SP 800-188 privacy models - 
  [csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final).
