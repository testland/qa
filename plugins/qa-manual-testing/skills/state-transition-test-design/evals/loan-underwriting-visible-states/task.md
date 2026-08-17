# Loan test cases nobody outside the team can run

## Problem Description

We are handing regression testing of the loan application journey to an
outsourced team. They get two logins: the applicant portal and the agent
console. They do not get database access and they will not get it - the table
holds live applicant financial data.

The pack we have today was written by a backend developer and half of its
expected results are things like "row moves to status_code 31" and
"is_locked flips to 1". None of that is runnable by the people who will be
running it, and worse, it hides that two different status codes look identical
to everybody outside the database. An application sitting in the underwriting
queue and one actively being worked by an underwriter are two codes and one
screen: both say "In Underwriting" in the portal and in the console.

The journey itself is straightforward. An application is received. The
underwriting team can ask for documents, which puts the ball back with the
applicant; uploading them sends it into underwriting. The underwriter approves
or declines. An approved application is funded when the money is disbursed,
which happens in a nightly batch. The applicant can walk away right up until
the money moves, and once it has moved the application is finished - finance
has had to write off two loans where an application was withdrawn after
disbursement and the funds were never recovered.

## Output Specification

Produce `docs/loan-lifecycle-tests.md` containing:

1. The model the cases come from: the situations an application can be in as
   the outsourced testers can tell them apart, and what each of the six things
   that can happen to an application does in each one.
2. Numbered manual test cases with steps and per-step expected results. Every
   expected result must be something a tester with only the applicant portal
   and the agent console can confirm.
3. A short list of any place where two internal situations are indistinguish-
   able from those two screens, and what that means for the pack.

Credit scoring rules, document OCR, and the disbursement bank integration are
out of scope. Do not write code and do not propose giving the testers database
access.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/loan-application-lifecycle.md ===============
# Consumer loan application - journey spec

## What the applicant and the agent can see

| Portal / console label | Meaning |
|---|---|
| Received | Submitted, waiting for the underwriting team to look at it |
| Documents needed | We have asked for paperwork; upload panel is open |
| In underwriting | With the underwriting team |
| Approved | Decision made, money not sent yet |
| Declined | Decision made, no money |
| Funded | Money disbursed |
| Withdrawn | The applicant pulled out |

Both screens show the label and the date it last changed. Nothing else about
the internal handling is visible.

## Things that can happen to an application

| Event | Who |
|---|---|
| docs-requested | Underwriting team, from the console |
| documents-uploaded | Applicant, from the portal |
| approve | Underwriter |
| decline | Underwriter |
| disburse | Nightly funding batch |
| withdraw | Applicant, from the portal, or an agent on their behalf |

## Rules

- A received application can have documents requested, or the applicant can
  upload the paperwork we asked for at submission time, which sends it into
  underwriting.
- Documents can be requested again while we are already waiting for them; the
  applicant gets another reminder and nothing else changes.
- Underwriting can send an application back for documents at any point before
  a decision.
- The portal's upload panel is hidden while an application is with an
  underwriter.
- Approve and decline are available only to an underwriter working an
  application that is in underwriting.
- The funding batch disburses approved applications only.
- The applicant can withdraw right up until the money moves.
- Declined, funded and withdrawn are the end of the journey.

=============== FILE: db/loan_applications.sql ===============
-- Internal schema. Testers do not have access to this; it is included so the
-- pack's author can see what the old cases were asserting on.
CREATE TABLE loan_applications (
  id                BIGINT PRIMARY KEY,
  applicant_id      BIGINT NOT NULL,
  status_code       SMALLINT NOT NULL,
  is_locked         TINYINT(1) NOT NULL DEFAULT 0,
  doc_reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  funding_batch_id  BIGINT NULL,
  decision_json     JSON NULL,
  updated_at        DATETIME NOT NULL
);

-- status_code values used by loan-service:
--   10 received
--   20 docs_requested
--   30 queued_for_underwriting   -- portal and console both show "In underwriting"
--   31 with_underwriter          -- portal and console both show "In underwriting"
--   40 approved
--   50 declined
--   60 funded
--   70 withdrawn
--
-- is_locked is set while an underwriter has the file open in the decision
-- editor and cleared when they save or navigate away. It is not surfaced
-- anywhere in the portal or the console.
-- funding_batch_id is populated when the nightly batch picks the application
-- up and stays populated afterwards.
