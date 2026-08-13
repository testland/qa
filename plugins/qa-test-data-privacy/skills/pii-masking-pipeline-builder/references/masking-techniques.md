# Data-masking techniques and privacy models

Companion reference for `pii-masking-pipeline-builder` (Step 3 operator
selection). Also the rule book the verification pass draws from.

## Overview

Masking is the act of transforming a real value into a substitute
that breaks the link to the original subject while preserving
testable properties (format, distribution, referential integrity).
Which technique is correct depends on three things: whether the
result must be reversible, whether the field is referentially
shared across tables, and what privacy model the dataset must
satisfy.

This is the **pure reference** that the pipeline builder and
leak-detection audits draw from to choose operators per field.

## When to use

- Picking the right masking operator for a field
  ([pii-categories.md](pii-categories.md)
  classified as PII).
- Deciding whether output is pseudonymised (still in GDPR scope) or
  anonymised (out of GDPR scope).
- Sizing a privacy model (k-anonymity / differential privacy)
  against utility loss.

## How to use this reference

1. **Classify the field** as direct identifier, quasi-identifier, or
   sensitive attribute ([pii-categories.md](pii-categories.md)).
2. **Decide the reversibility need** - must an authorised consumer recover
   the real value? If yes, pick a reversible operator (encryption, FPE,
   tokenisation, deterministic substitution); if no, pick an irreversible
   one from the seven-techniques catalog below.
3. **Preserve what the test needs** - format, distribution, or referential
   integrity across tables narrows the operator (deterministic substitution
   / salted hashing keep joins; shuffling keeps a column's distribution).
4. **Confirm the scope outcome** in the pseudonymisation-vs-anonymisation
   table - reversible output is still personal data under GDPR.
5. **Layer a dataset privacy model** when quasi-identifiers survive per-field
   masking - k-anonymity through differential privacy, in
   [privacy-models.md](privacy-models.md).
6. **Cross-check the anti-patterns** before shipping the pipeline.

## The seven canonical masking techniques

Drawing from the Wikipedia data-masking taxonomy
([en.wikipedia.org/wiki/Data_masking](https://en.wikipedia.org/wiki/Data_masking))
and ISO/IEC 20889:2018 (cite by stable ID; standard text behind
paywall):

### 1. Substitution

Replace the real value with an authentic-looking value from a
lookup table - "John Smith" → "Maria Garcia."

- **Reversibility:** Irreversible if the lookup is random per row.
  Reversible if the same input always maps to the same output
  (deterministic substitution); used as pseudonymisation.
- **Referential integrity:** Preserved when deterministic
  (`hash(real_id) → fake_id` keeps joins intact across tables).
- **Use for:** Names, addresses, employee IDs that must remain
  joinable across tables.
- **Tooling:** Presidio `replace` operator
  ([presidio.dataprivacystack.org/anonymizer](https://presidio.dataprivacystack.org/anonymizer/)),
  Faker library generators
  ([faker-masking-operators.md](faker-masking-operators.md)).

### 2. Shuffling

Randomly rearrange values **within a column** - salaries column
gets shuffled, each row keeps a real salary but no longer the right
person's salary.

- **Reversibility:** Irreversible.
- **Distribution:** Preserved exactly (it's the same set of
  values, reordered).
- **Use for:** Columns where the distribution matters for analytics
  but the per-row truth is sensitive (salary, performance score).
- **Risk:** If rare values exist (1 person earns $5M), shuffling
  doesn't anonymise them - the value identifies its row position
  cluster.

### 3. Number / date variance

Apply a bounded random offset: salary ± 10 %, dates ± 120 days
(Wikipedia data-masking page).

- **Reversibility:** Irreversible without the per-row offset key.
- **Use for:** Continuous numeric / temporal fields where
  approximate values are useful (analytics) but exact values are
  sensitive.
- **Risk:** Bounded variance may leak the original value (date ±
  120 days narrows to a year; salary ± 10 % narrows to a bracket).

### 4. Encryption

Apply a cryptographic algorithm with a key. Two sub-variants:

- **General encryption** (AES-256-GCM, etc.) - output is opaque
  ciphertext; reversible only with the key. Use for fields that
  must round-trip back to plaintext for authorised consumers.
- **Format-preserving encryption (FPE)** (FF1 / FF3 per NIST SP
  800-38G) - output has the **same format** as input (16-digit
  card → 16-digit ciphertext). Use when legacy systems validate
  format.

- **Reversibility:** Reversible (key required).
- **Use for:** PII that must round-trip for authorised business
  logic; legacy-format requirements.

### 5. Hashing

Apply a one-way hash (SHA-256 / SHA-512) with optional salt.

- **Reversibility:** Irreversible (assuming the salt + hash are
  cryptographically sound and the input space isn't enumerable).
- **Determinism:** Same input → same hash. Used as a deterministic
  pseudonym preserving referential integrity.
- **Risk:** Low-entropy fields (SSN with known format) are
  **enumerable** under unsalted hashing - attacker pre-computes
  all 1 billion possible SSNs. Always salt + per-tenant key.
- **Tooling:** Presidio `hash` operator with `hash_type` =
  `"sha256"` or `"sha512"` and `salt` parameter.

### 6. Nulling out / deletion

Replace the value with `NULL` or remove the column entirely.

- **Reversibility:** Irreversible.
- **Use for:** Fields with no analytical value to non-prod
  consumers (auth tokens, security questions, plaintext
  passwords).
- **Risk:** Schema constraints (NOT NULL) may block the operation;
  pipeline must coordinate with schema.

### 7. Masking-out / character scrambling

Show partial value - credit card "**** **** **** 1234," email
"j***@example.com."

- **Reversibility:** Irreversible (unmasked characters can leak
  some info - last-4 of card identifies brand + issuer family).
- **Use for:** Customer-facing displays where the user must
  recognise their own value; analytics that need partial info.
- **Tooling:** Presidio `mask` operator with `chars_to_mask`,
  `masking_char`, `from_end` parameters.

## Additional techniques

### Tokenisation

Replace the real value with a token (random opaque string) and
store the real-value → token map in a separate, access-controlled
vault.

- **Reversibility:** Reversible via the vault (authorised lookup).
- **Use for:** Payment processing (PCI-DSS-driven), any field
  where the token must round-trip for authorised consumers without
  exposing the value to the consuming system.

### Redaction

Remove the value entirely (no placeholder, no length signal).

- **Reversibility:** Irreversible.
- **Use for:** Free-text logs, screenshots, document exports where
  even the **presence** of a field is sensitive.
- **Tooling:** Presidio `redact` operator (no parameters).

### Synthetic substitution

Replace with a synthetically generated value preserving
distribution / format
([faker-masking-operators.md](faker-masking-operators.md);
`synthea-healthcare-data`
for health records).

- **Reversibility:** Irreversible.
- **Use for:** Demo / training environments where realistic-looking
  but never-real data is required.

## Microsoft Presidio anonymizer operators

Per [presidio.dataprivacystack.org/anonymizer](https://presidio.dataprivacystack.org/anonymizer/),
the Presidio Anonymizer engine supports six built-in operators:

| Operator | Parameters | Reversible | Maps to canonical technique |
|---|---|---|---|
| `replace` | `new_value` (defaults to `<entity_type>`) | No (random) / Yes (deterministic substitution) | #1 Substitution |
| `redact` | - | No | Redaction |
| `mask` | `chars_to_mask`, `masking_char`, `from_end` | No | #7 Masking-out |
| `hash` | `hash_type` (`sha256` / `sha512`), `salt` | No (one-way) | #5 Hashing |
| `encrypt` | `key` | Yes (with key) | #4 Encryption |
| `custom` | `lambda` | Depends on lambda | (caller-defined) |

Invocation: `engine.anonymize(text=, analyzer_results=, operators={"PERSON": OperatorConfig("replace", {"new_value": "BIP"})})`.

`OperatorConfig` constructor signature: `OperatorConfig(operator_name, params={})` (Presidio docs).

## Reversible vs irreversible - pseudonymisation vs anonymisation

GDPR Art. 4(5) defines pseudonymisation as "processing of personal
data in such a manner that the personal data can no longer be
attributed to a specific data subject without the use of additional
information, provided that such additional information is kept
separately" ([gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)).

| Technique | Pseudonymisation? | Anonymisation? |
|---|:---:|:---:|
| Deterministic substitution (same input → same output) | ✓ | - |
| Random substitution | - | ✓ |
| Shuffling | - | ✓ (when distribution-only) |
| Number / date variance | - | ✓ if variance ≥ identifying granularity |
| General encryption (key kept) | ✓ | - |
| FPE (key kept) | ✓ | - |
| Salted hashing (salt kept separately) | ✓ | - |
| Unsalted hashing of low-entropy field | ✗ (re-identifiable by enumeration) | ✗ |
| Nulling | - | ✓ |
| Masking-out (partial) | depends on revealed chars | depends |
| Tokenisation (vault kept) | ✓ | - |
| Tokenisation + vault destroyed | - | ✓ |
| Redaction | - | ✓ |
| Synthetic substitution | - | ✓ |

**Implication:** A "masking pipeline" output that uses reversible
techniques is **still personal data** under GDPR - it remains in
scope. Only fully irreversible output is out of GDPR scope per
Recital 26.

## Privacy models - NIST SP 800-188

NIST SP 800-188:2023 formalises statistical privacy models that sit
*above* the per-field operators - pick one for the whole dataset's
disclosure risk once quasi-identifiers remain after masking:

- **k-anonymity** - every record indistinguishable from k-1 others on
  the quasi-identifiers (generalise / suppress / aggregate).
- **l-diversity** - k-anonymity plus l well-represented sensitive
  values per equivalence class.
- **t-closeness** - l-diversity plus a sensitive-attribute distribution
  within t of the overall distribution.
- **Differential privacy** - a formal guarantee bounded by the privacy
  budget ε, achieved by noise injection on query outputs.

Full definitions, achievement methods, weaknesses, and ε / k guidance
(with NIST + primary-source citations):
[privacy-models.md](privacy-models.md).

## Picking a technique per field

| Field characteristic | Recommended technique | Privacy model layer |
|---|---|---|
| Must round-trip for authorised consumer (payment processing) | Tokenisation (vault) or FPE | none (reversible) |
| Must join across tables, opaque value OK | Deterministic substitution / salted hashing | k-anonymity on quasi-identifiers |
| Free-text PII inside a log line | Redaction or replace-with-`<TYPE>` (Presidio analyzer + anonymizer) | - |
| Continuous numeric for analytics | Number variance | t-closeness if sensitive attribute |
| Categorical demographic (race, etc.) for analytics | Generalisation + l-diversity | l-diversity |
| Statistical query release | Differential privacy mechanism | DP |
| Demo / training, no analytics utility needed | Synthetic substitution (Faker / Synthea) | n/a (no real data) |

## Worked example - masking a non-prod `customers` table

An analytics team needs a non-prod copy of a `customers` table. Walk each
field through the steps in "How to use this reference":

| Field | Need | Operator | Scope outcome |
|---|---|---|---|
| `customer_id` (FK, joined across tables) | Opaque but joinable | Deterministic substitution / salted hashing (#1 / #5) | Pseudonymised - reversible via key |
| `full_name` | No analytics value | Random substitution (Faker) | Anonymised |
| `email` | Support must recognise own value | Masking-out `j***@example.com` (#7) | Partial - depends on revealed chars |
| `national_id` (SSN) | No analytics value; enumerable format | Nulling out (#6) - never unsalted hashing | Anonymised |
| `date_of_birth` | Age band useful | Generalise to a band (age 47 → "40 - 50") | Anonymised (k-anonymity input) |
| `salary` | Distribution useful | Number variance ± 10 % (#3) | Anonymised - t-closeness if sensitive |
| `auth_token` | No analytics value | Nulling out / deletion (#6) | Anonymised |

**Resulting scope:** because `customer_id` uses a reversible deterministic
map, the output is **pseudonymised** - still personal data under GDPR
Recital 26. To move the dataset out of scope, destroy the substitution key
so `customer_id` can no longer be re-linked. The remaining quasi-identifiers
(`date_of_birth` band, `salary` bracket) then need a dataset privacy model -
see [privacy-models.md](privacy-models.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Unsalted hashing of SSN | SSN format is enumerable (~10⁹); attacker rebuilds the mapping table in minutes. | Salt + key per tenant; or tokenise via vault. |
| FPE for an analytics dataset | Format preservation lets a join attack with another dataset recover identity. | Use random substitution for analytics datasets that don't need format round-trip. |
| "GDPR-compliant" pseudonymisation claim | GDPR pseudonymised data is still personal data - Article 4(5) is explicit. | Either mark output pseudonymised (in scope) or fully anonymise (out of scope). |
| k = 2 anonymity | Re-identification probability is 50 % for the equivalence class. | k ≥ 5 typical; k = 10+ for high-risk datasets. |
| Shuffling a rare-value column | Outliers identify themselves regardless of position. | Combine shuffling with generalisation or suppression of outliers. |
| Number variance ± 1 % on salaries | The variance is smaller than the precision needed to identify; effectively no masking. | Variance must exceed the identifying granularity - ± 10 % minimum for salary. |
| Tokenisation without vault access controls | The vault becomes the single point of failure. | Strict access control + audit logging + separate key custody. |
| Differential privacy with ε = 100 | Useless budget; no privacy guarantee. | ε ≤ 1 typical for strong privacy; ε ≤ 10 for relaxed cases. |

## Limitations

- **No single technique fits every field.** Pipeline must apply
  per-field policy
  (`pii-masking-pipeline-builder`).
- **Re-identification research evolves.** NIST 800-188 Annex
  documents known attacks; the techniques above are sound under
  2024 attack models, not future ones.
- **Utility loss is real.** Aggressive anonymisation (high k, low
  ε) makes the dataset less useful for analytics. Pipeline owner
  must trade off explicitly.
- **Tooling support varies.** Presidio implements the Anonymizer
  operators above out of the box; k-anonymity / l-diversity / DP
  typically require additional libraries (ARX, OpenDP, IBM
  Differential Privacy Library) not part of Presidio.

## References

- ISO/IEC 20889:2018 "Privacy enhancing data de-identification
  terminology and classification of techniques" - cite by stable
  ID; statutory text via iso.org.
- NIST SP 800-188:2023 "De-Identifying Government Datasets" - 
  [csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final).
  Full k-anonymity / l-diversity / t-closeness / differential-privacy
  definitions (with primary-source citations) live in
  [privacy-models.md](privacy-models.md).
- NIST SP 800-38G "Recommendation for Block Cipher Modes of
  Operation: Methods for Format-Preserving Encryption" - FF1 /
  FF3 specs.
- Microsoft Presidio Anonymizer - 
  [presidio.dataprivacystack.org/anonymizer](https://presidio.dataprivacystack.org/anonymizer/).
- Wikipedia, "Data masking" - 
  [en.wikipedia.org/wiki/Data_masking](https://en.wikipedia.org/wiki/Data_masking).
- GDPR Article 4(5) pseudonymisation definition - 
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/).
- Related references:
  [pii-categories.md](pii-categories.md),
  `presidio-pii-detection`.
