---
name: compliance-coverage-scoring
description: "Scores existing tests and evidence against a named compliance framework's criteria list (GDPR, CCPA/CPRA, SOC 2 Trust Services Criteria, HIPAA Security Rule, PCI DSS, ISO/IEC 27001), marking every criterion met, partial, not met, or not applicable with a stated evidence requirement per state, and recording each scope exclusion with its criterion reference, reason, named approver, and re-review date. Includes an adversarial readiness-review mode with hard refusal rules (never \"ready\" with an unjustified gap), and the ISO/IEC 27001:2022 Annex A per-control test-pattern catalog in references/iso27001.md. Produces a readiness self-assessment only: not certification, not an audit opinion, not legal advice. Use when a framework version has been named and an evidence set already exists, and someone needs a per-criterion readiness score before an observation period opens, before a qualified assessor arrives, or in response to a regulator inquiry."
---

# Compliance coverage scoring

Resolve a named framework to its criteria list, score each criterion against the
evidence that actually exists, and record every excluded criterion with the four
fields that make an exclusion survivable under challenge.

## This produces a readiness self-assessment only

The result is a **readiness self-assessment**: not certification, not an
attestation, not an audit opinion, and not legal advice. Nothing produced here
demonstrates compliance to a regulator, a customer, or a court. It is an internal
gap list that tells a team what to fix before a qualified party looks, and only a
qualified party can attest - none of them is you.

Write that framing into the artifact itself, at the top, every time. A readiness
matrix that circulates without it gets mistaken for evidence of compliance. For
who can attest per framework and for precise result wording, see
[references/frameworks.md](references/frameworks.md).

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

Per-framework notes that change how the list is built - GDPR chapters by
controller/processor role, the CPRA amendments to score against, why SOC 2
criterion IDs must be pasted from the AICPA document rather than invented, keeping
the HIPAA Security/Privacy/Breach subparts unmixed, the PCI DSS v4.0.1 version pin,
and the ISO/IEC 27001:2022 full-reference rule - are in
[references/frameworks.md](references/frameworks.md). Read the note for whichever
framework is in play before building its list.

For ISO/IEC 27001:2022 engagements, the Annex A per-control test-pattern
catalog - the 93-control index, testable technical controls (A.8.x), Stage 1 /
Stage 2 evidence shapes, and Statement of Applicability scoping - is in
[references/iso27001.md](references/iso27001.md); it defines what a `met`
artifact looks like per Annex A control before you score it.

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

## Adversarial readiness review

Before a compliance audit (Type II observation period start, QSA dry-run, DPA
assessment), run the scoring pass in adversarial mode: assume the evidence set
is incomplete and make it prove otherwise. Discover what actually exists rather
than trusting the team's claimed coverage:

```bash
# Search test directories for compliance-relevant tests
grep -rE "(test_gdpr|test_ccpa|test_soc2|test_hipaa|test_pci)" tests/

# Search for compliance-tag annotations
grep -rE "@compliance\(" tests/ src/

# Discover audit-evidence collection scripts
find evidence/ -name "*.json" -o -name "*.py" -newer evidence/.last-collected
```

Map each in-scope criterion to the discovered tests and evidence, score per
Step 2, then apply the refusal rules. The reviewer **refuses** to:

- Mark "ready" if any required criterion is `not met`.
- Accept `not applicable` without all four required fields (criterion,
  reason, approver, re-review date).
- Accept a scope exclusion older than its re-review date.
- Approve a coverage map where audit-evidence is older than the
  observation period start.
- Map a single test to multiple criteria as "covers all" - each
  criterion needs its own dedicated assertion or composite test
  with explicit per-criterion verification.
- Skip the audit-trail criterion in any framework requiring it (HIPAA,
  PCI, SOC 2, GDPR Art. 5(1)(f)).

A review that trips any rule emits NOT READY with the tripped rule as the
first action item - there is no override short of fixing the gap or recording
a valid exclusion.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Matrix with no framework version in the header | Nobody can tell which criteria list was scored, so the result cannot be reproduced or re-used | Name the edition in the header (Step 1) |
| One artifact marked as covering several criteria | Assessors sample per criterion; the bundle reads as a gap on whichever criterion is sampled | Per-criterion verification, else `partial` (Step 2, rule 1) |
| Scope exclusion used to shrink the workload | The exclusion gets challenged, the work comes back, and the schedule is gone | Four mandatory fields with a named approver (Step 3) |
| Exclusions with no re-review date | The scope drifts and stale exclusions silently persist across cycles | Expiry voids the exclusion automatically (Step 3) |
| Reusing last cycle's matrix after a version change | Criterion numbering and content both moved | Rebuild from the source of record (Step 5, item 5) |
| Circulating the matrix as proof of compliance, or calling it "certified" / "compliant" | It is a self-assessment; no self-assessment produces certification or a compliance claim | Keep the disclaimer in the artifact and use "readiness" with the version and window (Step 4) |

## Naming precision in the output

Precise result wording (never "SOC 2 certified", the ISO/IEC 27001:2022
full-reference rule, stating PCI DSS results with the version and QSA, and why
"GDPR compliant" / "CCPA compliant" are not attestable states) is in
[references/frameworks.md](references/frameworks.md).

## Limitations

- Criteria lists here are pointers to sources of record, not copies. Regulatory,
  AICPA, and ISO texts change on their own schedules; re-read the source each cycle.
- SOC 2 criterion IDs are deliberately absent; the authoritative numbering lives in
  the AICPA document. Paste the real IDs from there.
- Applying a framework to a specific business, and deciding what is out of scope,
  are legal determinations. Scoring surfaces the question; a qualified adviser
  answers it.
