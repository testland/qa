---
name: data-masking-techniques-reference
description: "Pure-reference catalog of data-masking techniques and de-identification privacy models. Enumerates the seven canonical masking operators (substitution, shuffling, number/date variance, encryption, hashing, nulling, masking-out / character-scrambling) plus tokenisation, redaction, format-preserving encryption, and Microsoft Presidio's six built-in operators. Distinguishes reversible techniques (pseudonymisation candidates per GDPR Art. 4(5)) from irreversible techniques (anonymisation candidates). Maps techniques to NIST SP 800-188 privacy models - k-anonymity, l-diversity, t-closeness, differential privacy. Cites ISO/IEC 20889:2018 for the standard taxonomy. Use to pick the right masking operator per field type and risk level."
---

# data-masking-techniques-reference

## Overview

Masking is the act of transforming a real value into a substitute
that breaks the link to the original subject while preserving
testable properties (format, distribution, referential integrity).
Which technique is correct depends on three things: whether the
result must be reversible, whether the field is referentially
shared across tables, and what privacy model the dataset must
satisfy.

This skill is the **pure reference** that the pipeline builder
([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
and leak-detection audits draw from to
choose operators per field.

## When to use

- Picking the right masking operator for a field
  ([`pii-categories-reference`](../pii-categories-reference/SKILL.md)
  classified as PII).
- Deciding whether output is pseudonymised (still in GDPR scope) or
  anonymised (out of GDPR scope).
- Sizing a privacy model (k-anonymity / differential privacy)
  against utility loss.

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
  ([microsoft.github.io/presidio/anonymizer](https://microsoft.github.io/presidio/anonymizer/)),
  Faker library generators
  ([`faker-synthetic-data`](../faker-synthetic-data/SKILL.md)).

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
([`faker-synthetic-data`](../faker-synthetic-data/SKILL.md);
[`synthea-healthcare-data`](../synthea-healthcare-data/SKILL.md)
for health records).

- **Reversibility:** Irreversible.
- **Use for:** Demo / training environments where realistic-looking
  but never-real data is required.

## Microsoft Presidio anonymizer operators

Per [microsoft.github.io/presidio/anonymizer](https://microsoft.github.io/presidio/anonymizer/),
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

NIST SP 800-188:2023 ("De-Identifying Government Datasets",
[csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final))
formalises three statistical privacy models layered above the
techniques above:

### k-anonymity

A dataset is **k-anonymous** if every record is indistinguishable
from at least *k − 1* other records when projected on the
quasi-identifiers (Sweeney 2002, cited in NIST 800-188).

- **Achieve via:** Generalisation (age 47 → "40 - 50"), suppression
  (drop the row), and aggregation.
- **Picks `k`:** Typical values are k = 5, k = 10, k = 100
  depending on dataset size + risk tolerance.
- **Weakness:** Vulnerable to homogeneity attack - if all k records
  share the same sensitive value, k-anonymity doesn't protect it.

### l-diversity

Strengthens k-anonymity by requiring **at least l well-represented
values** of the sensitive attribute within each equivalence class
(Machanavajjhala et al. 2007).

- **Achieve via:** Suppression of records that would break l, or
  perturbation of sensitive values.
- **Weakness:** Vulnerable to skewness / similarity attack - the l
  values may be semantically similar.

### t-closeness

Strengthens l-diversity by requiring the distribution of the
sensitive attribute in each equivalence class be **close** (within
t, by Earth Mover's Distance) to the distribution in the overall
dataset (Li et al. 2007).

- **Trade-off:** Higher t = better utility, lower t = stronger
  privacy.

### Differential privacy

A formal mathematical guarantee: the probability of any output
changes by at most a multiplicative factor (e^ε) when a single
record is added/removed. ε (epsilon) is the privacy budget - lower
ε = stronger privacy.

- **Achieve via:** Noise injection (Laplace / Gaussian
  mechanism) on query outputs, not on the raw dataset.
- **Trade-off:** Utility-vs-budget. Apple, Google, US Census 2020
  use differential privacy.
- **Cite:** NIST SP 800-188:2023 §6; original Dwork 2006 "Calibrating
  noise to sensitivity."

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
  ([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md)).
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
  Definitions of k-anonymity, l-diversity, t-closeness,
  differential privacy.
- NIST SP 800-38G "Recommendation for Block Cipher Modes of
  Operation: Methods for Format-Preserving Encryption" - FF1 /
  FF3 specs.
- Microsoft Presidio Anonymizer - 
  [microsoft.github.io/presidio/anonymizer](https://microsoft.github.io/presidio/anonymizer/).
- Wikipedia, "Data masking" - 
  [en.wikipedia.org/wiki/Data_masking](https://en.wikipedia.org/wiki/Data_masking).
- GDPR Article 4(5) pseudonymisation definition - 
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/).
- Related references:
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md),
  [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md).
