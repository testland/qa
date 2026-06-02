---
name: synthetic-pii-generator
description: "Generates realistic-but-fake personally identifiable information (PII) - emails, phone numbers, SSNs / national IDs, addresses, names, credit-card numbers (test BIN ranges), date-of-birth - for non-production environments. Wraps Faker / mimesis with PII-aware constraints so generated values match real format expectations (Luhn-valid card numbers, region-valid phone formats, ITIN/SSN format) without ever generating real-person data. Use when seeding test environments, building demo data, or replacing real PII in copied datasets."
rating: 24
d6: 4
archetype: S3
---

# synthetic-pii-generator

## Overview

Real production data in non-prod environments is a compliance
nightmare - GDPR, CCPA, HIPAA all govern what can be copied where.
The fix is **synthetic PII**: data that **looks like** the real
thing (passes the same format validators) but **never matches** a
real person.

This skill wraps the synthetic-data libraries
([`faker-data`](../faker-data/SKILL.md),
[`mimesis-data`](../mimesis-data/SKILL.md),
[`bogus-data`](../bogus-data/SKILL.md)) with PII-specific
constraints to produce format-valid but identity-safe values.

**Default: Faker (Python)** - broadest locale coverage and the most
PII-aware defaults (RFC 2606 emails out of the box, deterministic
seeding via `Faker.seed()`). Use mimesis when the project needs
provider-level locale control (e.g. Japanese addresses with
prefecture accuracy); use Bogus for .NET projects that already
ship it.

> **Terminology note:** "PII" is regulatory shorthand
> (NIST SP 800-122, GDPR Article 4(1)). Different jurisdictions
> classify different fields as PII; this skill assumes the broad
> set: anything that could identify or be linked to a person.

## When to use

- Seeding a test environment that needs realistic-looking user
  records.
- Building demo / preview environments for sales, support, or
  customer onboarding.
- Replacing real PII in a database dump being moved to lower
  environments.
- Generating fixture rows for the
  [`seed-data-curator`](../seed-data-curator/SKILL.md) workflow.

## Step 1 - Identify the PII fields

For each field in the target schema, classify:

| Field                 | PII tier                                      |
|-----------------------|------------------------------------------------|
| Email                 | Direct (regulator-recognized PII).             |
| Full name             | Direct.                                        |
| Phone number          | Direct.                                        |
| Street address        | Direct.                                        |
| Date of birth (alone) | Indirect (combine with name → direct).         |
| Postal code (alone)   | Indirect.                                      |
| Government ID (SSN, ITIN, NIN, TIN, etc.) | Sensitive PII.            |
| Payment card number   | Sensitive PII (PCI scope; not GDPR PII per se). |
| Health record fields  | Special-category (GDPR Art. 9).                |
| User-generated content | Could embed PII; case-by-case.                |

This skill generates synthetic values for each - the matching
real-data pattern (format) without matching a real person.

## Step 2 - Use safe-by-construction values

### Email - RFC 2606 reserved domains

Per RFC 2606, these domains are **reserved for examples** and
guaranteed never to deliver to real mailboxes:

- `example.com`
- `example.org`
- `example.net`
- `*.example` (any subdomain)
- `*.test` / `*.invalid` / `*.localhost` (TLDs reserved for testing)

Faker / mimesis / Bogus all default to RFC 2606 domains. **Never
override to a real domain in synthetic-PII mode** - even if your
test fixture has good intentions, an integration that actually
sends email will spam real recipients.

```python
from faker import Faker
fake = Faker()
fake.email()                       # 'roccelline1878@example.com' — safe
fake.email(domain='gmail.com')     # NEVER — could spam real users
```

### Phone numbers - region-specific test ranges

| Region | Test range                                |
|--------|-------------------------------------------|
| US     | `(555) 0100` - `(555) 0199` (per Numbering Plan documentation, reserved for fictional use). |
| UK     | `0790 7900 000-999` (Ofcom reserved for drama/fiction). |
| Germany | `+49 (123) 4567-...` patterns reserved for examples. |

Faker's `phone_number` defaults to format-valid but doesn't
guarantee non-real numbers. For absolute safety, post-process
generated phone numbers to substitute the regional test range.

### Government IDs - never generate real-format

| ID                   | Synthetic strategy                                          |
|----------------------|-------------------------------------------------------------|
| US SSN               | Use the IRS test range `900-XX-XXXX` to `999-XX-XXXX` (not validly issued). Faker's `ssn()` defaults to invalid-format strings. |
| US ITIN              | Format: `9XX-7X-XXXX` or `9XX-8X-XXXX` (range reserved for ITIN issuance; never generate real values). |
| UK NI Number         | `AB123456C` patterns; use `JR987654A` style which HMRC reserves. |
| Generic              | If your test environment doesn't enforce format validation, use obvious-fake values like `000-00-0000`. |

**Never generate values from a real-issuance range.** A correctly-
formatted but real-issuance SSN may collide with a real person - 
exactly the privacy violation this skill avoids.

### Credit card numbers - test BIN ranges

Major card networks publish **test BIN ranges** that pass Luhn
checksum but never authorize. Use these in test fixtures:

| Card type        | Test BIN (use with random suffix; Luhn-valid)              |
|------------------|------------------------------------------------------------|
| Visa             | `4111 1111 1111 1111`                                      |
| Mastercard       | `5555 5555 5555 4444`                                      |
| American Express | `3782 822463 10005`                                        |
| Discover         | `6011 1111 1111 1117`                                      |

(Standard Stripe / Adyen test cards; documented in their respective
testing guides.)

The synthetic-PII generator emits these constants - Faker's
`credit_card_number()` produces format-valid but **may collide with
a real card if the issuer's BIN happens to match**. The Stripe/Adyen
test cards are guaranteed safe.

### Addresses - synthetic but plausibly local

```python
from mimesis import Address, Locale
addr = Address(Locale.JA)
addr.full_address()    # Japanese-format synthetic address
```

Mimesis / Faker generate format-valid addresses but not real
addresses. For absolute safety, prefix the address with `[TEST]`
or use the example-street convention (`100 Test St`).

### Date of birth - restrict the range

```python
from faker import Faker
fake = Faker()
fake.date_of_birth(minimum_age=18, maximum_age=80)
```

Restrict DOB to plausible ranges; combined with synthetic name +
address, the result is structurally complete without identifying
a real person.

## Step 3 - Persist synthetic markers

Mark every generated PII field as synthetic so a downstream review
can confirm the dataset's safety:

```yaml
# fixtures/users-test.yaml
users:
  - id: u1
    email: alice.doe-synthetic@example.com    # Suffix 'synthetic' for clarity
    name: Alice Doe
    phone: '+1 (555) 0123'                    # Test range
    ssn: '900-12-3456'                        # IRS test range
    card: '4111 1111 1111 1111'               # Stripe Visa test card
    _synthetic: true                          # Marker for audit
```

The `_synthetic: true` marker is a contract - every consumer
respects it (e.g. a "clear synthetic data" maintenance script can
delete all rows where `_synthetic = true` without affecting any
real production data).

## Output format

```markdown
## Synthetic PII generated for `<dataset-name>`

**Source factory library:** Faker (Python) | mimesis | Bogus | etc.
**Rows generated:** N
**PII tier breakdown:**
  - Direct: 4 fields (email, name, phone, address)
  - Indirect: 2 fields (zip, dob)
  - Sensitive: 2 fields (ssn, card)

### Safety guarantees

- All emails use RFC 2606 reserved domains.
- All phones use region-specific test ranges.
- All SSNs use the IRS test range (`900-XX-XXXX`).
- All cards use issuer-published Luhn-valid test BINs.
- All rows tagged `_synthetic: true`.

### Verification commands

```bash
# Confirm no email matches a real-looking domain
jq -r '.users[].email' fixtures/users-test.yaml | grep -v '@example\.\(com\|org\|net\)' && echo 'WARNING: non-test domain found'

# Confirm SSN range
jq -r '.users[].ssn' fixtures/users-test.yaml | grep -v '^9[0-9]{2}-' && echo 'WARNING: SSN outside IRS test range'
```
```

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Faker email with `domain='gmail.com'`                        | Generates `<random>@gmail.com` - could match a real Gmail user.    | Always RFC 2606 domains. |
| Real-format SSN without test-range constraint                | Random 9-digit numbers occasionally hit a real-issuance range.    | Always use the IRS test range. |
| Real card number ranges                                      | Even "fake" 16-digit Luhn-valid numbers can match a real BIN.     | Use issuer-published test BINs only. |
| Copying production database to staging "for realism"          | Compliance violation; PII bleeds; legal exposure.                  | Always synthetic; never copy production rows. |
| Skipping the `_synthetic: true` marker                        | Cleanup scripts can't distinguish synthetic from real data.        | Always tag synthetic rows. |
| Generating PII for ID fields the system stores indefinitely  | Synthetic value persists even after the fixture lifecycle.         | Use predictable identifiers (e.g. `test-user-001`) for IDs; reserve synthetic generation for human-facing fields. |

## Limitations

- **Real-format vs. real-validation drift.** A bank's KYC validator
  may flag the IRS test SSN range as invalid. Test against your
  validators; if they reject test ranges, choose another safe
  pattern.
- **Locale / regulatory coverage.** Some jurisdictions don't have
  documented test-range conventions for IDs. Use clearly-fake
  patterns (e.g. all-zero) as a fallback.
- **Doesn't replace tokenization.** For environments that need
  real shape but not real values across services, tokenization
  (real values stored encrypted; tokens flow through downstream)
  is a separate strategy.

## References

- RFC 2606 - reserved top-level DNS names (`example.com` etc.).
- IRS reserved test SSN ranges - IRS Publication 17 reference.
- Stripe testing - https://stripe.com/docs/testing - canonical test
  cards.
- Adyen testing - https://docs.adyen.com/development-resources/testing - alternative test card set.
- NIST SP 800-122 - Guide to Protecting the Confidentiality of PII.
- [`faker-data`](../faker-data/SKILL.md),
  [`mimesis-data`](../mimesis-data/SKILL.md),
  [`bogus-data`](../bogus-data/SKILL.md) - value-engine skills.
- [`seed-data-curator`](../seed-data-curator/SKILL.md) - downstream
  skill that uses this for E2E seed PII fields.
