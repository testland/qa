---
name: pii-categories-reference
description: "Pure-reference catalog of personally identifiable information (PII) categories across GDPR, CCPA/CPRA, NIST SP 800-122, and HIPAA. Defines what counts as personal data under each regime, enumerates the explicit identifiers each regulator lists (GDPR Art. 4(1) and Art. 9 special categories; CPRA sensitive personal information; NIST direct-identifier vs linkable distinction; HIPAA Safe Harbor 18 identifiers), and maps overlapping fields across jurisdictions so a masking pipeline knows which regulator's rules apply. Use as the authoritative source when authoring or reviewing masking rules, classifying a dataset's risk level, or scoping which fields a PII detector must catch."
rating: 25
d6: 5
archetype: S2
---

# pii-categories-reference

## Overview

This skill is the **canonical category catalog** that downstream
masking workflows
([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
and detectors
([`presidio-pii-detection`](../presidio-pii-detection/SKILL.md))
reference for scope. It enumerates four regimes:

- **GDPR** (EU General Data Protection Regulation, Regulation
  2016/679) - definitive for EU personal data.
- **CCPA/CPRA** (California Consumer Privacy Act + California
  Privacy Rights Act) - broadest US state law; many other states
  (VA, CO, CT, UT) follow its shape.
- **NIST SP 800-122** (US federal guide) - the federal
  agency-applicable definition; influential as a US-default model.
- **HIPAA** (Health Insurance Portability and Accountability Act,
  45 CFR § 164.514) - the Safe Harbor 18 identifiers for
  de-identification of protected health information (PHI).

This is a **pure reference** - no execution steps. Workflow skills
in this plugin consume it.

## When to use

- Authoring a masking rule and confirming which fields fall under
  which regulator's protection.
- Reviewing a dataset to classify its PII risk level before allowing
  it into a non-production environment.
- Scoping the recogniser set for a PII detector
  ([`presidio-pii-detection`](../presidio-pii-detection/SKILL.md)).
- Onboarding a tester to the vocabulary used by
  ([`pii-leak-critic`](../../agents/pii-leak-critic.md)).

## GDPR - personal data (Article 4(1))

**Definition** (Article 4(1)): "any information relating to an
identified or identifiable natural person ('data subject')"
([gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)).

The article enumerates identifiers that make a person identifiable:

| Identifier class | Examples |
|---|---|
| **Name** | Given name, surname, full name, online aliases linked to the person |
| **Identification number** | National ID, passport, driver's licence, tax ID, employee ID |
| **Location data** | GPS coordinates, IP-derived city/region, cell-tower triangulation |
| **Online identifier** | IP address, cookie ID, device fingerprint, advertising ID (per Recital 30) |
| **Physical/physiological factor** | Height, weight, eye colour, fingerprint, gait |
| **Genetic factor** | DNA-derived information (further defined in Art. 4(13)) |
| **Mental factor** | Diagnosed mental-health conditions, IQ test results |
| **Economic factor** | Salary, credit score, transaction history, account balances |
| **Cultural factor** | Language, religion, ethnic background |
| **Social factor** | Marital status, family relationships, social-network connections |

Source: Article 4(1) GDPR
([gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)).

### GDPR Article 9 - special categories of personal data

Article 9(1) lists categories whose processing is **prohibited by
default** unless one of the Article 9(2) exceptions applies:

- Racial or ethnic origin
- Political opinions
- Religious or philosophical beliefs
- Trade-union membership
- Genetic data (defined in Art. 4(13))
- Biometric data processed for unique identification (defined in
  Art. 4(14))
- Data concerning health (defined in Art. 4(15))
- Data concerning a natural person's sex life or sexual orientation

A masking pipeline for an EU dataset must apply **at least the
broader Art. 4(1) rules** and **stricter rules** to any field
falling under Art. 9 (special categories carry higher fines and
must be either redacted or fully anonymised, not merely
pseudonymised).

### GDPR Article 4(5) - pseudonymisation vs anonymisation

"Pseudonymisation" (Art. 4(5)) keeps data attributable to a subject
**with additional information**, kept separately. Pseudonymised
data is **still personal data** under GDPR - it remains in scope.

Anonymised data (no longer linkable to a subject under any
reasonably likely method, per Recital 26) falls **out** of GDPR
scope. The masking pipeline must mark which output is which
([`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md)
explains the techniques).

## CCPA / CPRA - personal information

**Definition** (Cal. Civ. Code § 1798.140(v)(1), as amended by
CPRA): "information that identifies, relates to, describes, is
reasonably capable of being associated with, or could reasonably be
linked, directly or indirectly, with a particular consumer or
household" ([oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa)).

Statutory categories enumerated in § 1798.140(v)(1)(A) - (K):

| # | Category | Examples |
|---|---|---|
| A | **Identifiers** | Name, postal address, email, IP address, account name, SSN, driver's licence, passport |
| B | **Customer records** | Records covered by Cal. Civ. Code § 1798.80(e) - name, signature, education, employment, financial info, medical, health-insurance, with paper/electronic regardless of storage medium |
| C | **Protected classifications** | Race, religion, gender, sexual orientation, age, national origin, disability, marital status (under California or federal law) |
| D | **Commercial information** | Purchases, products considered, consuming history |
| E | **Biometric information** | Fingerprints, retina, hand prints, voice recordings, keystroke patterns |
| F | **Internet/network activity** | Browsing history, search history, interaction with a website or app |
| G | **Geolocation data** | Physical location, movements, especially "precise geolocation" (CPRA refinement) |
| H | **Sensory data** | Audio, electronic, visual, thermal, olfactory recordings |
| I | **Professional/employment** | Job titles, salaries, employment records |
| J | **Education** | Education records as defined in 20 USC § 1232g (FERPA) |
| K | **Inferences** | Profile drawn from any of A - J to predict preferences, characteristics, predispositions, behaviour |

### CPRA - sensitive personal information (SPI)

CPRA added a subcategory of personal information requiring extra
protection (Cal. Civ. Code § 1798.140(ae)):

- Government identifiers - SSN, driver's licence, state ID,
  passport number
- Account log-in + password / financial account / debit-card /
  credit-card number with security code
- Precise geolocation (≤1,850 ft / 1,850 ft radius)
- Racial / ethnic origin, religious / philosophical beliefs, union
  membership
- Contents of mail, email, text messages (where the business isn't
  the intended recipient)
- Genetic data
- Biometric information processed to **uniquely identify** a
  consumer
- Health information (collected by businesses, distinct from HIPAA
  PHI)
- Sex life or sexual orientation

Citation: oag.ca.gov/privacy/ccpa "Sensitive Personal Information"
([oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa)).

## NIST SP 800-122 - PII

**Definition** (citing OMB Memorandum 07-16, reproduced in NIST SP
800-122 Section 2.1): "information which can be used to distinguish
or trace an individual's identity, such as their name, social
security number, biometric records, etc., alone, or when combined
with other personal or identifying information which is linked or
linkable to a specific individual, such as date and place of
birth, mother's maiden name, etc."

Citation: NIST SP 800-122:2010 §2.1, fetched from
[csrc.nist.gov/pubs/sp/800/122/final](https://csrc.nist.gov/pubs/sp/800/122/final).

### Linked vs linkable

NIST 800-122 §2.2 introduces a crucial distinction:

- **Linked information** is information about or related to an
  individual that is logically associated with other information
  about the individual.
- **Linkable information** is information about or related to an
  individual for which there is a possibility of logical
  association with other information about the individual.

A masking pipeline must consider *linkable* fields (e.g., birth
date alone isn't identifying, but date + zip + sex is - the
Sweeney 87 % rule). The pipeline shouldn't only protect direct
identifiers.

### Confidentiality impact levels

NIST 800-122 §3 names six factors that drive the PII
confidentiality impact level (low / moderate / high):

1. **Identifiability** - how directly the PII identifies
2. **Quantity** - how many individuals' data
3. **Data field sensitivity** - what specific fields (SSN > name)
4. **Context of use** - what the PII is used for
5. **Obligation to protect confidentiality** - legal duty
6. **Access to and location of PII** - where stored, who can
   access

Masking aggressiveness scales with impact level.

## HIPAA Safe Harbor - 18 identifiers (45 CFR § 164.514(b)(2))

For health data (PHI), the HIPAA Privacy Rule defines two
de-identification methods (Expert Determination, 45 CFR §
164.514(b)(1), and Safe Harbor, 45 CFR § 164.514(b)(2)). Safe
Harbor requires removing **all** of these 18 identifiers (per HHS
guidance,
[hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)):

1. Names
2. All geographic subdivisions smaller than a state (street, city,
   county, precinct, ZIP - except first 3 digits of ZIP if
   population > 20,000)
3. All elements of dates (except year) directly related to the
   individual, including birth, admission, discharge, death; all
   ages over 89 → "90 or older"
4. Phone numbers
5. Fax numbers
6. Electronic mail addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate / licence numbers
12. Vehicle identifiers (incl. licence plate)
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voiceprints)
17. Full-face photos and comparable images
18. Any other unique identifying number, characteristic, or code

A masking pipeline operating on health data must catch all 18; a
detector configured only for GDPR's broader categories will miss
HIPAA-required identifiers (e.g., medical record number is not
explicit in GDPR Art. 4(1) - covered by "identification number"
but a detector may not flag it without a HIPAA-specific
recogniser).

## Cross-jurisdiction map

The fastest way to scope a masking pipeline is to enumerate fields
present in the dataset and look up which regimes flag each:

| Field | GDPR Art. 4(1) | GDPR Art. 9 | CCPA/CPRA | CPRA SPI | NIST 800-122 | HIPAA Safe Harbor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Full name | ✓ | - | ✓ (A) | - | ✓ | ✓ (#1) |
| Email | ✓ | - | ✓ (A) | - | ✓ | ✓ (#6) |
| Phone | ✓ | - | ✓ (A) | - | ✓ | ✓ (#4) |
| SSN | ✓ | - | ✓ (A, B) | ✓ | ✓ | ✓ (#7) |
| Passport / driver's licence | ✓ | - | ✓ (A) | ✓ | ✓ | ✓ (#11) |
| IP address | ✓ (Recital 30) | - | ✓ (A) | - | linkable | ✓ (#15) |
| Cookie / device ID | ✓ | - | ✓ (A) | - | linkable | ✓ (#13) |
| Birth date | linkable | - | ✓ (A) | - | linkable | ✓ (#3 - months/days) |
| Precise geolocation | ✓ | - | ✓ (G) | ✓ | ✓ | ✓ (#2 - sub-state) |
| Race / ethnicity | ✓ | ✓ | ✓ (C) | ✓ | - | - |
| Religion | ✓ | ✓ | ✓ (C) | ✓ | - | - |
| Sexual orientation | ✓ | ✓ | ✓ (C) | ✓ | - | - |
| Health condition | ✓ | ✓ (Art. 4(15)) | ✓ (B) | ✓ | ✓ | - (covered by PHI rules) |
| Genetic data | ✓ | ✓ (Art. 4(13)) | ✓ (B) | ✓ | - | - |
| Biometric (face, fingerprint) | ✓ | ✓ (Art. 4(14)) | ✓ (E) | ✓ (if uniquely identifying) | ✓ | ✓ (#16, #17) |
| Account login + password | ✓ | - | ✓ (A) | ✓ | ✓ | ✓ (#10) |
| Credit-card / IBAN | ✓ | - | ✓ (A, D) | ✓ | ✓ | ✓ (#10) |
| Medical record number | ✓ | - (covered in B) | ✓ (B) | ✓ (health subset) | ✓ | ✓ (#8) |
| Browsing history | ✓ | - | ✓ (F) | - | ✓ | ✓ (#14) |
| Purchase records | ✓ | - | ✓ (D) | - | ✓ | - |
| Inferred profile / score | ✓ | - | ✓ (K) | - | linkable | - |

"linkable" = field alone may not identify, but combined with other
fields it does (NIST §2.2).

## Common confusions

| Confusion | Reality |
|---|---|
| "PII = SSN, name, email." | These are subsets. GDPR personal data includes online identifiers, location, biometrics, inferences. Use the full Art. 4(1) list. |
| "If we pseudonymise, GDPR doesn't apply." | False. Pseudonymised data **remains** personal data under GDPR Art. 4(5); only full anonymisation removes it from scope. |
| "CCPA only covers consumers." | CCPA "consumer" includes employees and job applicants under CPRA (Cal. Civ. Code § 1798.140(i)). |
| "HIPAA only covers hospitals." | HIPAA covers covered entities (providers, plans, clearinghouses) and business associates. Business associates inherit HIPAA obligations via BAAs. |
| "Birth date alone isn't PII." | Per NIST §2.2 it's **linkable** - combined with ZIP + sex it identifies ~87 % of US population (Sweeney 2000). Treat as PII. |
| "IP address isn't personal data." | GDPR Recital 30 lists IP addresses as online identifiers. CJEU *Breyer* (C-582/14) confirmed dynamic IPs are personal data when linkable. |
| "CPRA SPI is the same as GDPR Art. 9." | Overlaps but isn't identical - CPRA SPI explicitly includes government IDs + financial-account + login credentials that aren't in Art. 9. Map both lists separately. |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Single-list scoping | Only catches one regime's identifiers; leaks the others. | Use the cross-jurisdiction map above as the union scope. |
| Treating PHI as "just sensitive PII" | HIPAA Safe Harbor has 18 specific identifiers - birth date months, vehicle IDs, certificate numbers - that GDPR lists don't enumerate. | Apply HIPAA Safe Harbor when the dataset is PHI. |
| Mapping CCPA to GDPR Art. 9 only | CPRA SPI includes financial + government identifiers Art. 9 doesn't. | Apply CPRA SPI as a separate scope layer. |
| Stopping at "direct identifiers" | NIST §2.2 says linkable info is PII. Date-of-birth + ZIP + sex re-identifies most individuals. | Include linkable fields in scope. |
| Pseudonymisation = anonymisation | GDPR Art. 4(5) keeps pseudonymised data personal. | Document which masking outputs are pseudonymised (in scope) vs anonymised (out of scope). |
| Ignoring inferred profiles | CCPA category K covers inferences. A "risk score" derived from PII is itself PII. | Treat inferred / derived fields the same as their sources. |

## Limitations

- **Statutes evolve.** This catalog reflects GDPR (2016, in force
  2018), CCPA (2018) as amended by CPRA (2020, in force 2023),
  NIST SP 800-122 (2010), HIPAA Privacy Rule (45 CFR Part 164,
  current). Re-fetch citations annually.
- **Jurisdiction is not exhaustive.** This skill covers four
  high-frequency regimes. Other regimes (LGPD Brazil, PIPEDA
  Canada, APPI Japan, PDPA Singapore, PIPL China) have similar
  but non-identical lists.
- **Sectoral additions exist.** GLBA (US financial), FERPA (US
  education), COPPA (US children), state-specific laws (VA CDPA,
  CO CPA, etc.) add fields. When a dataset crosses sectors,
  consult the sector-specific list.
- **PII detection is heuristic.** A detector
  ([`presidio-pii-detection`](../presidio-pii-detection/SKILL.md))
  finds **patterns** that look like PII; it cannot guarantee
  category-completeness. Reviewer must spot-check.

## References

- Article 4 GDPR (Definitions) - 
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)
- Article 9 GDPR (Processing of special categories) - 
  [gdpr-info.eu/art-9-gdpr/](https://gdpr-info.eu/art-9-gdpr/)
- California Consumer Privacy Act (as amended by CPRA), Office of
  the Attorney General overview - 
  [oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa)
- California Civil Code § 1798.140 (definitions) - cite by stable
  ID; statutory text available via leginfo.legislature.ca.gov
- NIST Special Publication 800-122, "Guide to Protecting the
  Confidentiality of PII" (2010) - 
  [csrc.nist.gov/pubs/sp/800/122/final](https://csrc.nist.gov/pubs/sp/800/122/final)
- HIPAA Privacy Rule, 45 CFR § 164.514 - De-identification
  Standard. HHS guidance:
  [hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)
- Consumer-side neighbour:
  [`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) - generates fake PII for test fixtures (different scope; this
  reference defines what to mask in **existing** data).
- Downstream consumers:
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md),
  [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md),
  [`pii-leak-critic`](../../agents/pii-leak-critic.md).
