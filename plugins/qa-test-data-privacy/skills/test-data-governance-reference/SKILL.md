---
name: test-data-governance-reference
description: "Pure-reference catalog of test-data lifecycle governance: retention schedules for test datasets, cross-environment data-sharing agreements, deletion of test data containing real PII, refresh cadence, access controls, and the legal basis for each policy under GDPR Art. 5 storage limitation and NIST SP 800-122. Use when defining a data-steward role for test environments, authoring a retention policy for a test database, scoping a data-sharing agreement before promoting a dataset from production to staging, or determining the deletion timeline for any test fixture that contains live personal data."
keywords:
  - test data
  - data governance
  - retention policy
  - GDPR
  - NIST
  - data steward
  - PII
  - data lifecycle
---

# test-data-governance-reference

## Overview

This skill is the **canonical governance catalog** for test data that contains
or originates from personal data. It covers the full data lifecycle inside
non-production environments: collection/intake, retention, cross-environment
promotion, refresh, access control, and deletion. It does not generate or mask
test data - see
[`synthetic-data`](../faker-synthetic-data/SKILL.md) and
[`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md) for
those workflows.

This is a **pure reference** - no execution steps. Governance decisions depend
on it; detection and masking workflows in this plugin enforce it.

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
([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
was bypassed. The data steward must approve any T4 exception in writing and set
a hard deletion timestamp at intake.

### Retention metadata record

Each dataset admitted to a test environment must carry a metadata record:

- Dataset ID (UUID)
- Source type: synthetic / pseudonymised / partially masked / production copy
- Tier (T1-T4)
- PII categories present (from
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md))
- Date admitted
- Retention expiry date (calculated from tier)
- Data steward name and contact
- Deletion certificate reference (populated at deletion)

Storing this record alongside the dataset (or in a governance register) satisfies
GDPR Art. 5(2) accountability and gives the data steward the audit trail NIST
800-122 §4 requires.

## Cross-environment data-sharing agreements

When a dataset moves between environments (production to staging, staging to
dev, dev to a third-party test vendor), a data-sharing agreement (DSA) must
be in place before the transfer. The DSA governs:

1. **Purpose statement.** The specific test goal that justifies the transfer
   (GDPR Art. 5(1)(b) purpose limitation). A vague "QA use" is not sufficient;
   name the sprint, the feature, or the compliance audit.

2. **Data categories transferred.** Enumerated from the cross-jurisdiction map
   in [`pii-categories-reference`](../pii-categories-reference/SKILL.md) so
   all applicable regimes are in scope.

3. **Receiving environment classification.** Documents whether the target
   environment meets the access control and audit standard required for the
   tier (NIST 800-122 §4 control families apply here).

4. **Retention limit in the receiving environment.** Must be equal to or
   shorter than the source environment retention, never longer.

5. **Deletion obligation.** Receiving party must confirm deletion and provide
   a certificate no later than 5 business days after expiry.

6. **Onward transfer restriction.** The receiving environment may not forward
   the dataset to a fourth environment without a separate DSA. This prevents
   uncontrolled fan-out of high-impact datasets across test fleets.

Third-party vendors (outsourced QA teams, penetration testers, performance
testing partners) accessing environments containing personal test data are
processors under GDPR Art. 4(8) and require a Data Processing Agreement (DPA)
in addition to the DSA. The DPA must specify the categories of data, the
processing purposes, and deletion obligations at contract end.

## Deletion of test data containing real PII

### When deletion is required

Deletion is required when any of these conditions is met:

- Retention expiry for the assigned tier (see table above).
- Test run or sprint that justified the dataset is complete.
- Data steward receives a data-subject erasure request that reaches back to
  a production source from which a test dataset was derived (GDPR Art. 17
  right to erasure propagates to derived test copies).
- Environment is decommissioned or reassigned.
- Masking audit reveals that an unmasked field slipped through
  (a leak-detection audit raises this flag).

### Deletion standard

Deletion from relational databases must remove the rows and the backup
snapshots of the test environment taken while the PII was present - retaining
a backup that contains the PII extends the effective retention period.

For file-based fixtures (JSON, CSV, SQL dumps): overwrite or securely delete
the file and remove it from version control history. Presence in git history
counts as retention under GDPR Art. 5(1)(e).

Upon deletion, the data steward issues a **deletion certificate** containing:

- Dataset ID
- Date of deletion
- Method (truncate, secure delete, environment wipe)
- Confirmation that backups containing the dataset were also deleted or expired
- Steward signature (or equivalent approval record)

The certificate populates the governance register's Deletion certificate
reference field and satisfies the GDPR Art. 5(2) accountability requirement.

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

Access to test datasets containing personal data follows the NIST 800-122
principle of minimum necessary access (referenced in §4 control recommendations,
grounded in the Fair Information Practices). In practice:

- **Role-based access:** only testers whose test case requires the data are
  granted access. Developers not running those tests do not have access to
  the test database or fixture files.
- **Shared credentials are prohibited:** each accessor has an individual account
  so the audit log (NIST 800-122 control family: Audit and Accountability) can
  attribute access to a named person.
- **Elevated-access review:** T3 and T4 environments require the data steward's
  approval for new access grants. Access is time-bounded to the duration of the
  test engagement.
- **Read-only by default:** write or delete access to a test dataset containing
  personal data must be justified separately. A tester running assertions does
  not need INSERT or UPDATE.
- **Offboarding:** when a tester leaves the project or the vendor engagement
  ends, access must be revoked the same day. The offboarding checklist must
  include test-environment credentials.

CI pipelines that access test databases containing personal data must use
dedicated service accounts (not developer credentials) and those accounts must
be reviewed when the pipeline is decommissioned.

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
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md) applies.
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
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md)
- Sibling skill (masking pipeline):
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md)
