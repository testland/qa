---
name: test-data-governance-reference
description: "Pure-reference catalog of test-data lifecycle governance: retention schedules for test datasets, cross-environment data-sharing agreements, deletion of test data containing real PII, refresh cadence, access controls, and the legal basis for each policy under GDPR Art. 5 storage limitation and NIST SP 800-122. Use when defining a data-steward role for test environments, authoring a retention policy for a test database, scoping a data-sharing agreement before promoting a dataset from production to staging, or determining the deletion timeline for any test fixture that contains live personal data."
metadata:
  keywords: "test data, data governance, retention policy, GDPR, NIST, data steward, PII, data lifecycle"
---

# test-data-governance-reference

## Overview

This skill is the **canonical governance catalog** for test data that contains
or originates from personal data. It covers the full data lifecycle inside
non-production environments: collection/intake, retention, cross-environment
promotion, refresh, access control, and deletion. It does not generate or mask
test data - see
`synthetic-data` and
`pii-masking-pipeline-builder` for
those workflows.

This is a **pure reference** - no execution steps. Governance decisions depend
on it; detection and masking workflows enforce it.

## How to use

1. Classify the dataset at intake by PII confidentiality impact level and assign
   a retention tier (T1-T4) from the tier table.
2. Write the retention metadata record (dataset ID, source type, tier, PII
   categories, admit date, expiry, data steward) into the governance register.
3. Before any cross-environment promotion, put a data-sharing agreement (and a
   DPA for third-party processors) in place
   ([references/data-sharing-agreements.md](references/data-sharing-agreements.md)).
4. Grant access on a minimum-necessary, individually-attributable basis
   ([references/access-controls.md](references/access-controls.md)).
5. Refresh production-derived datasets by re-deriving and re-masking on the
   tier's cadence, never by appending rows.
6. On expiry, sprint completion, or an erasure request, delete the dataset and
   its backups and issue a deletion certificate
   ([references/deletion-standard.md](references/deletion-standard.md)).
7. Assign a named data steward to own the retention clock and the register.

## Legal basis

### GDPR Article 5 - storage limitation (Art. 5(1)(e))

GDPR Art. 5(1)(e) requires that personal data be "kept in a form which permits
identification of data subjects for no longer than is necessary for the purposes
for which the personal data are processed"
([gdpr-info.eu/art-5-gdpr/](https://gdpr-info.eu/art-5-gdpr/)).

The same article's accountability clause (Art. 5(2)) requires the data
controller to "be able to demonstrate compliance" - meaning retention schedules
and deletion records must exist in writing, not just in practice.

Storage limitation applies to test data whenever real personal data was used as
the source. The "purpose" driving the test cycle has a defined end: the
test run, the sprint, the release, or the compliance period. Retaining a
production-derived test dataset beyond that purpose has no legal basis under
Art. 5(1)(b) (purpose limitation) or Art. 5(1)(e).

Exception path: Art. 89(1) permits extended retention for archiving in the
public interest, scientific/historical research, or statistical purposes,
provided "appropriate safeguards...for the rights and freedoms of the data
subject" are in place and data minimization (including pseudonymisation where
feasible) is applied
([gdpr-info.eu/art-89-gdpr/](https://gdpr-info.eu/art-89-gdpr/)). Regression
baselines in a commercial test environment do not qualify as Art. 89 research.

### NIST SP 800-122 - PII confidentiality and lifecycle controls

NIST SP 800-122 ("Guide to Protecting the Confidentiality of Personally
Identifiable Information", April 2010, authors McCallister, Grance, Scarfone)
grounds the technical lifecycle controls in this skill. The publication is
the US federal guidance authority on PII protection and covers access control,
audit and accountability, media protection, planning, and risk assessment as
control families for PII systems
([csrc.nist.gov/pubs/sp/800/122/final](https://csrc.nist.gov/pubs/sp/800/122/final)).

NIST 800-122 Section 2.1 defines PII using the OMB Memorandum 07-16 formulation:
information that can distinguish or trace an individual's identity, alone or
combined with other personal or identifying information that is linked or
linkable to a specific individual. This means test fixtures containing indirect
identifiers (birth date, ZIP, job title) fall in scope, not just obvious direct
identifiers.

NIST 800-122 Section 4 recommends safeguards aligned to the PII confidentiality
impact level (low / moderate / high, scored on identifiability, quantity,
sensitivity, context of use, legal obligations, and access/location). Impact
level drives the retention control tier applied below.

## Test-data lifecycle stages

```
[Source: production snapshot / synthetic generation]
        |
        v
[Intake: classify, mask or reject, record metadata]
        |
        v
[Test environment: access-controlled, scoped to sprint/release]
        |
        v
[Refresh: re-derive from source on each cycle, or flag for extension]
        |
        v
[Deletion: time-bound, audited, certificate issued]
```

Each stage requires a named data steward accountable for the decision to
advance, hold, or destroy. The steward role is the governance gap most often
missing in QA organisations: masking and detection tooling exists, but no
single role owns the retention clock or the deletion record.

## Retention policies

### Tier definitions

Retention tier is driven by the dataset's PII confidentiality impact level
(NIST 800-122 §3) and the GDPR Art. 5(1)(e) necessity test.

| Tier | Impact level | Retention limit | Basis |
|---|---|---|---|
| **T1 - fully synthetic** | None (no linkable PII) | Unlimited | No personal data; GDPR Art. 5 does not apply |
| **T2 - pseudonymised** | Low (linkable, not directly identifying) | Duration of the release cycle + 30 days | GDPR Art. 5(1)(e) necessity; NIST 800-122 §4 low-impact controls |
| **T3 - partially masked** | Moderate (some direct identifiers remain) | Duration of the sprint + 7 days | GDPR Art. 5(1)(e); NIST 800-122 §4 moderate controls |
| **T4 - production copy or minimally altered** | High (direct identifiers present) | 48 hours maximum; delete immediately after test run if possible | GDPR Art. 5(1)(e) + Art. 5(1)(b); NIST 800-122 §4 high controls |

T4 datasets should not exist in test environments as a matter of policy. Their
presence means the masking gate
(`pii-masking-pipeline-builder`)
was bypassed. The data steward must approve any T4 exception in writing and set
a hard deletion timestamp at intake.

### Retention metadata record

Each dataset admitted to a test environment must carry a metadata record:

- Dataset ID (UUID)
- Source type: synthetic / pseudonymised / partially masked / production copy
- Tier (T1-T4)
- PII categories present (from
  `pii-categories-reference`)
- Date admitted
- Retention expiry date (calculated from tier)
- Data steward name and contact
- Deletion certificate reference (populated at deletion)

Storing this record alongside the dataset (or in a governance register) satisfies
GDPR Art. 5(2) accountability and gives the data steward the audit trail NIST
800-122 §4 requires.

## Cross-environment data-sharing agreements

When a dataset moves between environments, a data-sharing agreement (DSA) must
be in place before the transfer, and third-party vendors additionally require a
Data Processing Agreement (DPA) as processors under GDPR Art. 4(8). The six DSA
clauses (purpose, data categories, receiving-environment classification,
retention limit, deletion obligation, onward-transfer restriction) and the DPA
requirement are in
[references/data-sharing-agreements.md](references/data-sharing-agreements.md).

## Deletion of test data containing real PII

Deletion is triggered by retention expiry, sprint completion, a GDPR Art. 17
erasure request reaching a production source, environment decommissioning, or a
leak-detection flag. It must remove the rows plus the backup snapshots and git
history that held the PII, after which the data steward issues a deletion
certificate satisfying GDPR Art. 5(2) accountability. The full trigger list,
deletion standard, and certificate contents are in
[references/deletion-standard.md](references/deletion-standard.md).

## Refresh cadence

Production-derived test datasets go stale for two reasons: the underlying
data changes, and the retention clock advances. Refresh policy must account
for both.

Recommended cadences by tier:

| Tier | Refresh cadence | Trigger |
|---|---|---|
| T1 (fully synthetic) | On schema change or quarterly | Schema drift in production |
| T2 (pseudonymised) | Each release cycle | Retention expiry or schema change |
| T3 (partially masked) | Each sprint | Retention expiry |
| T4 (production copy) | Not applicable - treat as one-time use | Delete after each test run; do not reuse |

Refresh means re-deriving the dataset from the current source and re-applying
the masking pipeline, not recycling the old dataset with new rows appended.
Appending new production rows to an existing T3 dataset resets the retention
clock to the newest row but does not remedy any unmasked fields already present.

## Access controls

Access follows the NIST 800-122 minimum-necessary principle: role-based grants,
individual (never shared) accounts for attributable audit logs, data-steward
approval for T3/T4, read-only by default, same-day offboarding, and dedicated
CI service accounts. The full control list is in
[references/access-controls.md](references/access-controls.md).

## The data-steward role

The data steward is the accountable human for a test dataset's lifecycle. In
most QA organisations this role is not formally assigned, creating the
governance gap this skill addresses. Without a named steward:

- Retention clocks are never started (no one set the expiry date at intake).
- Deletion is triggered only by capacity pressure, not by policy.
- Cross-environment promotions happen ad hoc without DSAs.
- GDPR Art. 5(2) accountability cannot be demonstrated because no one owns
  the record.

Minimum data-steward responsibilities:

1. Approve intake of any T3 or T4 dataset and set the retention expiry.
2. Maintain the governance register (metadata records + deletion certificates).
3. Receive and act on alerts when retention expiry is reached.
4. Approve access grants for T3/T4 environments.
5. Confirm deletion and issue the deletion certificate.
6. Escalate erasure requests that reach back to test copies.

The steward need not be a dedicated role. A senior QA engineer or a test
environment owner can hold it - but the assignment must be explicit and
documented, not implied by job title.

## Worked example

A team needs a staging dataset built from a production customer table to test a
billing feature this sprint.

1. **Intake + tier.** The extract still carries names and emails after a partial
   mask, so it scores Moderate impact and is classified **T3**: retention is the
   sprint duration + 7 days. A metadata record with the expiry date and the
   named data steward goes into the governance register.
2. **Promotion.** Because the data moves production -> staging, a DSA names the
   billing feature as the purpose, enumerates the PII categories, and sets the
   staging retention no longer than production's
   ([references/data-sharing-agreements.md](references/data-sharing-agreements.md)).
3. **Access.** Only the two testers on the billing story receive individual,
   read-only accounts; the CI job uses a dedicated service account
   ([references/access-controls.md](references/access-controls.md)).
4. **Deletion.** When the sprint completes, the T3 clock runs 7 more days; at
   that expiry the steward truncates the tables, confirms the nightly backups
   holding the data have expired, and issues a deletion certificate that
   populates the register
   ([references/deletion-standard.md](references/deletion-standard.md)).

Result: the billing feature was tested against realistic data, and the T3
clock, DSA, access log, and deletion certificate together demonstrate GDPR
Art. 5(2) accountability end to end.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "We masked it, so retention is unlimited." | Pseudonymised data is still personal data under GDPR Art. 4(5) and remains in scope of Art. 5(1)(e). | Assign a T2 retention limit, not "unlimited". |
| Refreshing by appending rows to the existing dataset. | Extends the effective retention period of old rows; may reintroduce unmasked fields. | Re-derive and re-mask the full dataset on each refresh. |
| Storing T4 datasets in version control. | Git history is a retention medium; presence in history counts as ongoing retention. | Block fixture commits containing PII via pre-commit hooks; if already committed, purge history and rotate exposed identifiers. |
| Shared test-environment credentials. | Audit log is not attributable to a named person; NIST 800-122 §4 audit accountability requirement is unmet. | Issue individual accounts; use short-lived tokens for CI. |
| Treating third-party QA vendors as internal users. | Vendors are processors under GDPR Art. 4(8); no DPA = unlawful processing. | Execute a DPA before granting any access to environments containing personal data. |
| Extending retention when tests are delayed. | "Tests aren't done yet" is not a new legal basis; the necessity test under Art. 5(1)(e) is purpose-bound, not timeline-bound. | Either complete the tests within the retention window or re-derive a fresh dataset for the extension period. |
| No named data steward. | No one owns the retention clock or the deletion record; accountability under GDPR Art. 5(2) cannot be demonstrated. | Explicitly assign the steward role and document it in the governance register. |

## Limitations

- **Sector-specific overlays not covered.** HIPAA (45 CFR § 164.514) requires
  de-identification to Safe Harbor standards before PHI may be used in test
  environments; the 18-identifier list in
  `pii-categories-reference` applies.
  FERPA, GLBA, COPPA add analogous requirements for their sectors.
- **Retention schedules are organisation-specific.** The tier table above
  provides baseline defaults; legal counsel must approve the final schedule
  for each organisation based on applicable jurisdiction and sector.
- **Erasure propagation is technically complex.** Tracking which test datasets
  derived from a specific production subject requires lineage metadata at
  intake. Without lineage records, an Art. 17 erasure request cannot be
  honoured for derived test copies.
- **This catalog reflects:** GDPR (Regulation 2016/679, in force 2018) and
  NIST SP 800-122 (April 2010). Re-check citations annually; NIST 800-188
  (de-identification) and successor publications may supersede sections of
  SP 800-122.

## References

- GDPR Article 5 - Principles relating to processing of personal data
  (storage limitation at Art. 5(1)(e); accountability at Art. 5(2)):
  [gdpr-info.eu/art-5-gdpr/](https://gdpr-info.eu/art-5-gdpr/)
- GDPR Article 89 - Safeguards and derogations for archiving, research,
  and statistical purposes:
  [gdpr-info.eu/art-89-gdpr/](https://gdpr-info.eu/art-89-gdpr/)
- NIST Special Publication 800-122, "Guide to Protecting the Confidentiality
  of Personally Identifiable Information (PII)", McCallister, Grance, Scarfone,
  April 2010:
  [csrc.nist.gov/pubs/sp/800/122/final](https://csrc.nist.gov/pubs/sp/800/122/final)
- GDPR Article 4(5) - definition of pseudonymisation:
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)
- GDPR Article 4(8) - definition of processor:
  [gdpr-info.eu/art-4-gdpr/](https://gdpr-info.eu/art-4-gdpr/)
- GDPR Article 17 - right to erasure:
  [gdpr-info.eu/art-17-gdpr/](https://gdpr-info.eu/art-17-gdpr/)
- Sibling skill (PII category catalog):
  `pii-categories-reference`
- Sibling skill (masking pipeline):
  `pii-masking-pipeline-builder`
- Reference files:
  [references/data-sharing-agreements.md](references/data-sharing-agreements.md),
  [references/deletion-standard.md](references/deletion-standard.md),
  [references/access-controls.md](references/access-controls.md)
