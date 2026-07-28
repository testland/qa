# Framework reference: who attests, per-framework notes, naming precision

Companion to `compliance-coverage-scoring/SKILL.md`. Detail a scoring pass needs
occasionally, kept out of the spine so the body stays a lean overview.

## Who attests (and none of them is you)

The scoring pass produces a readiness self-assessment. Only the parties below can
attest:

| Framework | Who attests | What the attestation is |
|---|---|---|
| SOC 2 | A CPA firm performing an examination under AICPA attestation standards (the illustrative type 2 report is written to meet [SSAE-21 reporting requirements](https://www.aicpa-cima.com/resources/download/illustrative-service-auditors-soc-2-r-type-2-report/)) | A report on controls over a defined scope and period. Not a pass/fail certificate, and there is no such thing as being "SOC 2 certified" |
| ISO/IEC 27001 | A certification body whose competence an accreditation body has independently confirmed ([iso.org](https://www.iso.org/standard/27001)) | A certificate against a stated edition |
| PCI DSS | A Qualified Security Assessor: "independent security organizations that have been qualified and trained by PCI SSC to perform PCI DSS assessments" ([pcisecuritystandards.org](https://www.pcisecuritystandards.org/standards/pci-dss/)) | An assessment against a stated version |
| GDPR | A supervisory authority, on enforcement | No routine attestation exists |
| CCPA/CPRA | The California Privacy Protection Agency and the Attorney General; consumers have been able to file CCPA complaints with the agency since July 1, 2023 ([oag.ca.gov](https://oag.ca.gov/privacy/ccpa)) | No routine attestation exists |

## Per-framework notes that change how the list is built

- **GDPR.** The articles group into Chapter II Principles (Articles 5 to 11),
  Chapter III Rights of the data subject (Articles 12 to 23), and Chapter IV
  Controller and processor (Articles 24 to 43), per the structure published at
  [gdpr-info.eu](https://gdpr-info.eu/). Which chapters are in scope depends on
  whether the entity acts as controller, processor, or both. Decide that first,
  in writing, because it determines half the exclusions later.
- **CCPA/CPRA.** Proposition 24 (the CPRA) amended the CCPA with protections that
  began 1 January 2023, including a right to correct inaccurate information and a
  right to limit use of sensitive personal information; implementing regulations
  sit at Title 11, Division 6, Section 7001 et seq. of the California Code of
  Regulations ([oag.ca.gov](https://oag.ca.gov/privacy/ccpa)). Score against the
  statute and the regulations, not the statute alone.
- **SOC 2.** The criteria are organized as common criteria plus category-specific
  criteria for security, availability, processing integrity, confidentiality, and
  privacy. **The criterion identifiers are not reproduced here**: AICPA
  distributes the Trust Services Criteria document itself, its numbering is
  authoritative there, and inventing criterion IDs is worse than having none.
  Read them out of the [TSC document](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
  and paste the real IDs into the matrix. Also record which categories are in
  scope, since only security is common to every SOC 2 engagement.
- **HIPAA Security Rule.** Administrative safeguards are at
  [§164.308](https://www.ecfr.gov/current/title-45/section-164.308), physical at
  [§164.310](https://www.ecfr.gov/current/title-45/section-164.310), technical at
  [§164.312](https://www.ecfr.gov/current/title-45/section-164.312). The Privacy
  Rule is a different subpart (Subpart E, §§164.500 to 164.535, including
  [§164.502](https://www.ecfr.gov/current/title-45/section-164.502)) and Breach
  Notification is another (Subpart D, §§164.400 to 164.414); do not silently mix
  them into one Security Rule matrix.
- **PCI DSS.** v4.0.1 was published 11 June 2024 as a limited revision of v4.0
  (published March 2022) with "no additional or deleted requirements"
  ([PCI SSC](https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1)).
  A matrix built against v3.2.1 numbering does not transfer, so state the version
  in the header and rebuild rather than remap.
- **ISO/IEC 27001.** The current standard is Edition 3, published 2022-10
  ([iso.org](https://www.iso.org/standard/27001)). Read the Annex A control list
  out of the edition you are being assessed against, not out of a blog summary.
  ISO asks that the standard be referred to by full reference, for example
  "certified to ISO/IEC 27001:2022" rather than "certified to ISO 27001"; carry
  that precision into the matrix header.

## Naming precision in the output

Compliance wording carries legal weight, so the matrix should say only what is
true:

- SOC 2 is an **examination over a defined scope and period**, reported under
  AICPA attestation standards
  ([illustrative type 2 report](https://www.aicpa-cima.com/resources/download/illustrative-service-auditors-soc-2-r-type-2-report/)).
  Never write "SOC 2 certified" or "passed SOC 2".
- ISO asks for the full reference: "certified to ISO/IEC 27001:2022", not
  "certified to ISO 27001" ([iso.org](https://www.iso.org/standard/27001)).
- PCI DSS results are stated with the version and the assessing QSA
  ([pcisecuritystandards.org](https://www.pcisecuritystandards.org/standards/pci-dss/)).
- "GDPR compliant" and "CCPA compliant" are not attestable states. Scope the
  claim to the articles or code sections that were assessed, over the window they
  were assessed in.
