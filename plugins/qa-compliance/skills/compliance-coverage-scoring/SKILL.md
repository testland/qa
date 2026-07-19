---
name: compliance-coverage-scoring
description: "Scores existing tests and evidence against a named compliance framework's criteria list (GDPR, CCPA/CPRA, SOC 2 Trust Services Criteria, HIPAA Security Rule, PCI DSS, ISO/IEC 27001), marking every criterion met, partial, not met, or not applicable with a stated evidence requirement per state, and recording each scope exclusion with its criterion reference, reason, named approver, and re-review date. Produces a readiness self-assessment only: not certification, not an audit opinion, not legal advice. Use when a framework version has been named and an evidence set already exists, and someone needs a per-criterion readiness score before an observation period opens, before a qualified assessor arrives, or in response to a regulator inquiry."
---

# Compliance coverage scoring

Resolve a named framework to its criteria list, score each criterion against the
evidence that actually exists, and record every excluded criterion with the four
fields that make an exclusion survivable under challenge.

## Read this before producing any output

The result is a **readiness self-assessment**. It is not certification, not an
attestation, not an audit opinion, and not legal advice. Nothing produced here
demonstrates compliance to a regulator, a customer, or a court. It is an internal
gap list that tells a team what to fix before a qualified party looks.

Only the parties below can attest, and none of them is you:

| Framework | Who attests | What the attestation is |
|---|---|---|
| SOC 2 | A CPA firm performing an examination under AICPA attestation standards (the illustrative type 2 report is written to meet [SSAE-21 reporting requirements](https://www.aicpa-cima.com/resources/download/illustrative-service-auditors-soc-2-r-type-2-report/)) | A report on controls over a defined scope and period. Not a pass/fail certificate, and there is no such thing as being "SOC 2 certified" |
| ISO/IEC 27001 | A certification body whose competence an accreditation body has independently confirmed ([iso.org](https://www.iso.org/standard/27001)) | A certificate against a stated edition |
| PCI DSS | A Qualified Security Assessor: "independent security organizations that have been qualified and trained by PCI SSC to perform PCI DSS assessments" ([pcisecuritystandards.org](https://www.pcisecuritystandards.org/standards/pci-dss/)) | An assessment against a stated version |
| GDPR | A supervisory authority, on enforcement | No routine attestation exists |
| CCPA/CPRA | The California Privacy Protection Agency and the Attorney General; consumers have been able to file CCPA complaints with the agency since July 1, 2023 ([oag.ca.gov](https://oag.ca.gov/privacy/ccpa)) | No routine attestation exists |

Write that framing into the artifact itself, at the top, every time. A readiness
matrix that circulates without it gets mistaken for evidence of compliance.

## What this owns, and what it does not

Owns: resolving a framework plus version to a criteria list, assigning one of
four states per criterion, defining what evidence each state requires, recording
scope exclusions, and emitting a coverage matrix with a readiness verdict.

Does not own: implementing controls, writing the tests, running scanners,
collecting or storing evidence artifacts, and certifying anything. Those are
separate jobs with separate outputs. This one reads what exists and scores it.

## Step 1: resolve the framework to a versioned criteria list

A criteria list without a version is not scorable. Name the edition in the
output header, and take the criterion identifiers from the source of record
rather than from memory.

| Framework | Name it as | Source of record |
|---|---|---|
| GDPR | Regulation (EU) 2016/679 | [eur-lex.europa.eu/eli/reg/2016/679/oj](https://eur-lex.europa.eu/eli/reg/2016/679/oj); article-by-article structure at [gdpr-info.eu](https://gdpr-info.eu/) |
| CCPA as amended by CPRA | California Civil Code Title 1.81.5, beginning at §1798.100 | Statute at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5); regulator overview at [oag.ca.gov/privacy/ccpa](https://oag.ca.gov/privacy/ccpa) |
| SOC 2 | AICPA 2017 Trust Services Criteria (with revised points of focus, 2022) | [aicpa-cima.com](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022) |
| HIPAA Security Rule | 45 CFR Part 164 Subpart C, §§164.302 to 164.318 | [ecfr.gov](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C) |
| PCI DSS | The exact version, for example PCI DSS v4.0.1 | [pcisecuritystandards.org/document_library](https://www.pcisecuritystandards.org/document_library/) |
| ISO/IEC 27001 | ISO/IEC 27001:2022 (Edition 3, published 2022-10) | [iso.org/standard/27001](https://www.iso.org/standard/27001) |

Per-framework notes that change how the list is built:

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

### Required versus addressable (HIPAA specifically)

45 CFR §164.306(d) states that implementation specifications are either required
or addressable, with the word "Required" or "Addressable" printed in parentheses
after the title, and that for an addressable specification the entity must assess
whether it is reasonable and appropriate, document the decision, and implement an
equivalent alternative where reasonable and appropriate
([§164.306](https://www.ecfr.gov/current/title-45/section-164.306)). So
"Encryption and decryption (Addressable)" at
[§164.312(a)(2)(iv)](https://www.ecfr.gov/current/title-45/section-164.312) with
a documented alternative is a **documented deviation**, not a gap, and is scored
`met` with the deviation record as its evidence. "Unique user identification
(Required)" at §164.312(a)(2)(i) has no such route.

## Step 2: score each criterion

Four states. Each has an evidence bar, and a criterion that does not clear its
bar drops to the state below.

| State | Evidence required | Not sufficient |
|---|---|---|
| `met` | A named artifact (test file, log export, signed record, deviation memo) mapped to that one criterion ID, dated inside the assessment window, and carrying its result | A control that exists in a policy but produced no artifact in the window |
| `partial` | An artifact exists but covers only part of the criterion's scope, or appears intermittently across the window, or verifies design without verifying operation | Treating "we mostly do this" as met |
| `not met` | No artifact maps to the criterion, or the only mapped artifact failed and was not remediated in the window | Leaving it blank, or folding it into a neighbouring criterion |
| `not applicable` | A scope exclusion carrying all four fields from Step 3, still inside its re-review date | An assertion that it does not apply, with no record behind it |

Four scoring rules that decide most disputed cells:

1. **One criterion, one dedicated verification.** An artifact claimed to cover
   several criteria at once is scored `partial` for each of them until each
   criterion has its own verification, or the composite artifact names each
   criterion and shows a distinct result per criterion. Assessors sample per
   criterion, so a bundled artifact reads as a gap on whichever one gets sampled.
2. **Evidence is window-bound.** For a period-based engagement, an artifact dated
   before the period opened does not count toward that period. Score it `not met`
   for the current window even if it was `met` last cycle.
3. **Design is not operation.** A policy, a runbook, or a one-off screenshot
   evidences that a control was designed. For a period-based engagement, score
   design-only evidence `partial` until there is recurring evidence spanning the
   window.
4. **A failing artifact is worse than a missing one.** If the mapped test ran and
   failed inside the window, score `not met` and flag it separately: unremediated
   known failures are the finding an assessor writes up first.

Record, per criterion, the artifact path or identifier and its date. A matrix
whose cells say `met` with nothing beside them cannot be re-checked by anyone,
including you next quarter.

## Step 3: record scope exclusions (four mandatory fields)

A criterion becomes `not applicable` only through a written exclusion carrying
**all four** of these. Three out of four is not an exclusion.

| Field | What makes it valid | What voids it |
|---|---|---|
| **Criterion** | An exact reference to a single criterion, for example `164.504(e)` or `Art. 37` | A section range, a whole domain, or the word "general" |
| **Reason** | The specific facts about this entity or this scope that put the criterion out of reach, stated so a third party can test them | "Not applicable to us", or a reason that restates the exclusion |
| **Approver** | A named accountable individual with role and date, typically the DPO, CISO, or compliance officer | A team name, a shared alias, an unattributed "management approved" |
| **Re-review date** | A calendar date by which the exclusion must be re-justified | An open-ended exclusion, or a date already past |

Enforcement rules:

- An exclusion missing any field is not `not applicable`. Score the criterion
  `not met` and list the missing field as the action item.
- An exclusion past its re-review date is void on the day it expires. The
  criterion reverts to `not met` automatically.
- An exclusion is bound to the scope statement it was approved under. If the
  scope changes (new system, new data category, new processing purpose, new
  cardholder-data flow), every exclusion is void until re-approved.
- Exclusions are the first thing a qualified assessor challenges, and several
  are legal determinations rather than engineering ones. GDPR
  [Art. 27](https://gdpr-info.eu/art-27-gdpr/) (representatives of controllers or
  processors not established in the Union) and
  [Art. 37](https://gdpr-info.eu/art-37-gdpr/) (designation of a data protection
  officer) are routinely excluded on entity-specific grounds, and those grounds
  need the named approver's judgment recorded, not an engineer's inference.

Exclusion record shape:

```yaml
- criterion: "164.504(e)"
  framework: "HIPAA Security Rule (45 CFR Part 164 Subpart C)"
  scope: "Business associate, ePHI processing for clinical-trial sponsor X"
  reason: >
    Single-purpose service under one executed BAA with no subcontractor
    handling ePHI; no downstream BAA chain exists to verify.
  approver: "J. Okonkwo, Compliance Officer"
  approved: "2026-04-15"
  re_review: "2026-10-15"
```

## Step 4: emit the coverage matrix

```markdown
## Compliance readiness self-assessment: <framework + version> (<commit or date>)

> Readiness self-assessment only. Not certification, not an audit opinion,
> not legal advice. Only a qualified assessor can attest to this framework.

**Framework:** HIPAA Security Rule, 45 CFR Part 164 Subpart C
**Scope:** Business associate handling ePHI for a clinical-trial sponsor
**Assessment window:** 2026-01-01 to 2026-06-30
**Criteria in scope:** 24 | **Artifacts mapped:** 47 | **Exclusions:** 1

### Per-criterion coverage

| Criterion | Name | State | Evidence | Action |
|---|---|---|---|---|
| §164.308(a)(1)(ii)(A) | Risk analysis (Required) | met | risk-analysis-2026-02.pdf, 2026-02-11 | none |
| §164.308(a)(3)(ii)(C) | Termination procedures (Addressable) | partial | tests/test_offboarding.py, runs since 2026-04 only | Extend evidence to cover Jan to Mar or restate the window |
| §164.310(d)(2)(i) | Disposal (Required) | partial | tests/test_device_wipe.py asserts wipe occurred, not the method | Assert the sanitization method against a named standard |
| §164.312(a)(2)(i) | Unique user identification (Required) | met | tests/test_unique_user_id.py, green all 6 months | none |
| §164.312(a)(2)(iv) | Encryption and decryption (Addressable) | met | deviation memo 2026-01-08 plus compensating-control record | Re-review at window close |
| §164.312(b) | Audit controls | not met | none mapped | Emit and retain access records for ePHI reads and writes |
| §164.312(e)(1) | Transmission security | partial | tests/test_https_required.py covers redirect only | Add a cipher-strength assertion |
| §164.504(e) | Organizational requirements (BAA) | n/a | Exclusion approved 2026-04-15 by J. Okonkwo, re-review 2026-10-15 | none |

### Summary

met 4 | partial 3 | not met 1 | n/a 1 (1 valid exclusion, 0 invalid)

### Verdict

NOT READY. One in-scope criterion is `not met` (§164.312(b) audit controls) and
three are `partial`.

### Action items, highest severity first

1. §164.312(b): no access-record evidence exists for the window. Closing this
   after the window ends does not retroactively cover the window.
2. §164.310(d)(2)(i): the disposal test asserts that a wipe happened but not
   which method was used. Assert against a named sanitization standard such as
   NIST SP 800-88 Rev. 1 (https://csrc.nist.gov/pubs/sp/800/88/r1/final).
3. §164.312(e)(1): extend the TLS test past redirect behaviour to negotiated
   cipher strength.
```

Verdict bands. These are a **practitioner convention for internal triage, not a
threshold defined by any of the frameworks**, and no band is a compliance claim:

| Band | Condition |
|---|---|
| NOT READY | Any in-scope criterion is `not met`, or any exclusion is invalid or expired |
| NEEDS WORK | Nothing `not met`, at least one `partial` |
| READY FOR ASSESSMENT | Every in-scope criterion `met`, every exclusion complete and current. This says the evidence set looks complete to you. It says nothing about what a qualified assessor will conclude |

## Step 5: the pre-audit dry run

For any framework assessed over a period rather than at a point in time, one
scoring pass at the end is too late: evidence that was never collected in month
two cannot be created in month six.

1. **Before the window opens.** Score the full criteria list while gaps are still
   fixable. This run is the point of the whole exercise.
2. **Monthly during the window.** Re-score to catch evidence-collection breakage:
   a job that stopped writing artifacts in month three turns a `met` criterion
   into `partial` without anyone noticing. Monthly is a convention, not a
   requirement of any framework; pick a cadence shorter than the time it would
   take to notice a broken collector.
3. **At window close.** Final pass before the assessor engages. Anything still
   `partial` should be disclosed rather than discovered.
4. **After the assessment.** Re-baseline the matrix against the actual findings.
   Where the assessor scored a criterion differently than you did, the difference
   is the calibration signal: fix the scoring rule, not just the criterion.
5. **On any framework version change.** A version change invalidates the mapping,
   not just the content. Rebuild the list from the new source of record and
   re-score from zero.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Matrix with no framework version in the header | Nobody can tell which criteria list was scored, so the result cannot be reproduced or re-used | Name the edition in the header (Step 1) |
| One artifact marked as covering several criteria | Assessors sample per criterion; the bundle reads as a gap on whichever criterion is sampled | Per-criterion verification, else `partial` (Step 2, rule 1) |
| Scope exclusion used to shrink the workload | The exclusion gets challenged, the work comes back, and the schedule is gone | Four mandatory fields with a named approver (Step 3) |
| Exclusions with no re-review date | The scope drifts and stale exclusions silently persist across cycles | Expiry voids the exclusion automatically (Step 3) |
| Reusing last cycle's matrix after a version change | Criterion numbering and content both moved | Rebuild from the source of record (Step 5, item 5) |
| Circulating the matrix as proof of compliance | It is a self-assessment; presenting it as attestation misleads the recipient | Keep the disclaimer in the artifact (Step 4 template) |
| Calling the result "certified" or "compliant" | No self-assessment produces either state | Use "readiness", and name the version and window |

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

## Limitations

- The criteria lists here are pointers to sources of record, not copies of them.
  Regulatory text and the AICPA and ISO criteria documents change on their own
  schedules; re-read the source at the start of each cycle.
- SOC 2 criterion identifiers are deliberately absent because the authoritative
  numbering lives inside a document AICPA distributes directly. Take the IDs from
  there.
- Applying a framework to a specific business, and deciding what is genuinely out
  of scope, are legal determinations. Scoring surfaces the question; a qualified
  adviser answers it.
