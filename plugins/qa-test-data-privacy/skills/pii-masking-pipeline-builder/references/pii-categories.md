# PII categories - cross-regime catalog

Companion reference for `pii-masking-pipeline-builder` (Step 2 field
classification). Also the scoping source for `presidio-pii-detection`
recogniser sets.

## Overview

This is the **canonical category catalog** that the masking pipeline
and detectors reference for scope. It enumerates four regimes:

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
consume it.

## When to use

- Authoring a masking rule and confirming which fields fall under
  which regulator's protection.
- Reviewing a dataset to classify its PII risk level before allowing
  it into a non-production environment.
- Scoping the recogniser set for a PII detector
  (`presidio-pii-detection`).
- Onboarding a tester to the vocabulary used by leak-detection
  reviews.

## Per-regime identifier catalogs

The full enumerations - GDPR Art. 4(1) identifiers and Art. 9 special
categories with the Art. 4(5) pseudonymisation distinction, the CCPA/CPRA
statutory categories and CPRA sensitive personal information, NIST SP 800-122
linked-vs-linkable and the six confidentiality-impact factors, and the HIPAA
Safe Harbor 18 identifiers - are in
[regime-catalogs.md](regime-catalogs.md). The
cross-jurisdiction map below is the fast scoping tool; consult the catalogs for
the per-regime detail behind each column.

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
| "CCPA only covers consumers." | CCPA "consumer" includes employees and job applicants under CPRA (Cal. Civ. Code § 1798.140(i)). |
| "HIPAA only covers hospitals." | HIPAA covers covered entities (providers, plans, clearinghouses) and business associates. Business associates inherit HIPAA obligations via BAAs. |
| "IP address isn't personal data." | GDPR Recital 30 lists IP addresses as online identifiers. CJEU *Breyer* (C-582/14) confirmed dynamic IPs are personal data when linkable. |

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
- **Jurisdiction is not exhaustive.** This catalog covers four
  high-frequency regimes. Other regimes (LGPD Brazil, PIPEDA
  Canada, APPI Japan, PDPA Singapore, PIPL China) have similar
  but non-identical lists.
- **Sectoral additions exist.** GLBA (US financial), FERPA (US
  education), COPPA (US children), state-specific laws (VA CDPA,
  CO CPA, etc.) add fields. When a dataset crosses sectors,
  consult the sector-specific list.
- **PII detection is heuristic.** A detector
  (`presidio-pii-detection`)
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
  `synthetic-pii-generator` (in the qa-test-data plugin) - generates fake PII for test fixtures (different scope; this
  reference defines what to mask in **existing** data).
- Downstream consumers:
  `pii-masking-pipeline-builder` (host skill),
  `presidio-pii-detection`.
