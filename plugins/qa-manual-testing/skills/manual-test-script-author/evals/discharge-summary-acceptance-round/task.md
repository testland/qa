# The ward manager cannot run the acceptance script we sent her

## Problem Description

Our discharge-summary module goes live at St Brigid's in three weeks. The
contract makes the customer's written acceptance the trigger for the final
invoice, and the person who signs is Sister Adeyemi, the ward manager on Ward 4B.
She is not a developer and has never opened a terminal.

The acceptance script we sent her was written by a backend engineer. She got to
line 2, replied "I don't know what any of this means", and the acceptance session
was cancelled. We have one rescheduled session and she has ninety minutes.

Two more problems with what we sent. It never connects any step back to the five
things the contract actually says we must demonstrate, so even a completed run
would not tell our commercial team whether we can invoice. And it slips a
rejection case into the middle of the run, which last time led to an argument
about whether an expected error counted as a failure.

## Output Specification

Produce one markdown document at exactly `uat/UAT-003-discharge-summary.md`
containing:

1. A run-through of the discharge journey that Sister Adeyemi can complete on her
   own, in the words she already uses for her job.
2. Everything that must be in place before she starts her first action, drawn
   from the attached files.
3. For each action, what she should see happen, described so that she can mark it
   good or not good without interpretation.
4. An explicit link from each contractual item in the attached statement of work
   to the action(s) that demonstrate it.
5. The written confirmation section the contract requires, naming both signing
   parties and the dated agreement being satisfied.
6. Somewhere to record anything that goes wrong during the session.

Out of scope: the technical regression pack, automation, and any change to the
product.

## Input Files

Extract the following files before beginning.

=============== FILE: uat/UAT-DISCHARGE.md ===============
# Discharge acceptance

1. Authenticate against the UAT tenant and obtain a bearer token.
2. POST /api/v2/encounters/{encounterId}/discharge with status FINAL;
   assert 201 and that the response body contains a summaryId.
3. Confirm a row lands in discharge_summary with status = 'FINAL' and
   signed_by populated.
4. Verify the outbound HL7 ADT^A03 message appears on the integration
   queue within 30s.
5. Repeat step 2 with a malformed patient identifier; assert 422 and the
   error code INVALID_PATIENT_ID.
6. Check the PDF renders (S3 bucket stbrigid-uat-summaries, key
   summaries/{summaryId}.pdf).
7. Confirm the GP letter job is enqueued.

=============== FILE: contracts/sow-acceptance-criteria.md ===============
# Statement of Work - Schedule 3, dated 2026-02-11

Acceptance is achieved when the Customer confirms in writing that each of
the following has been demonstrated on the UAT environment.

| ID     | The system shall...                                                        |
|--------|----------------------------------------------------------------------------|
| AC-3.1 | Allow a ward manager to start a discharge for a patient on their own ward.  |
| AC-3.2 | Carry the patient's current medication list into the discharge summary.     |
| AC-3.3 | Require the discharging clinician's name before the summary can be finalised.|
| AC-3.4 | Produce a printable discharge summary the ward can hand to the patient.     |
| AC-3.5 | Send the summary to the patient's registered GP practice.                   |

Rejection behaviour for invalid records is covered by Schedule 4 and is not
part of this acceptance round.

=============== FILE: uat/environment-and-data.md ===============
# St Brigid's UAT environment

URL: https://stbrigid.uat.carevault.example
Release under acceptance: v3.4.0 (shown bottom-right of the login screen)
Sessions are booked for Ward 4B only.

## Accounts

| Login              | Person                | Role                      |
|--------------------|-----------------------|---------------------------|
| s.adeyemi.uat      | Sister Adeyemi        | Ward Manager, Ward 4B     |
| dr.okonkwo.uat     | Dr Okonkwo            | Consultant, Ward 4B       |
| bed.mgr.uat        | Bed Management        | Read-only, all wards      |

Passwords are handed over in the session, not stored in this file.

## Seeded patients (Ward 4B, refreshed each Monday 06:00)

| Record   | Name          | Bed    | Notes                                       |
|----------|---------------|--------|---------------------------------------------|
| 4B-1102  | Aoife Byrne   | 4B-06  | 3 active medications, GP practice registered|
| 4B-1103  | Tomas Varga   | 4B-09  | no GP practice on file                      |
| 4B-1104  | Nia Roberts   | 4B-11  | already discharged last Monday              |

## Printing and post

The ward printer on 4B is `PRN-4B-01`. GP letters in UAT are not posted;
they land in the practice mailbox viewer at
https://stbrigid.uat.carevault.example/uat-tools/practice-mailbox
usually within five minutes.
