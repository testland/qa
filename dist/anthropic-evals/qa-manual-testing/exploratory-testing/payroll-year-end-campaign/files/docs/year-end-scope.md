# Year-end payroll - what customers do in this window

## The flow

1. Customer closes the final pay period of the tax year.
2. The year-end run produces per-employee statements and an employer
   summary.
3. The filing submission goes to the tax authority's gateway; the gateway
   replies with an accept or a per-record reject list.
4. Rejected records are corrected in the product and resubmitted; a
   correction after acceptance follows a separate amended-submission path.
5. Statements are published to the employee self-service portal and
   optionally emailed.

## What is new this year

- The amended-submission path was rewritten; last year it was manual.
- Statement documents moved to a new PDF renderer.
- The gateway now returns a structured reject list; previously it returned
  a single error string, and our parsing of the new format is new code.
- Employers with more than 250 employees are submitted in chunks of 100;
  chunking is new.

## Known risk notes

- A partially accepted submission (some records accepted, some rejected)
  has never been exercised end to end outside a developer's machine.
- Employees who left mid-year appear in the run but not in the portal.
  Reported last year, closed as "works as designed", disputed by support.
- The chunked submission has no visible progress; a customer cannot tell a
  slow submission from a stuck one.
- Statement emails go out in a single batch; a bounce is silently dropped.

## Ownership

- Tax calculation engine (rates, thresholds, statutory payments):
  payroll-core team. Unit-level coverage exists. Do not duplicate.
- Everything else in this document: our squad.
