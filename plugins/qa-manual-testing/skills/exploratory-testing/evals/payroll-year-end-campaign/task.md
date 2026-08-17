# Six blocks of tester time across three days before year-end payroll

## Problem Description

Year-end payroll processing opens for customers in two weeks. It is the
highest-stakes window we have: every UK customer runs their final pay period
and their year-end filing through the product in the same fortnight, and a
defect that reaches them costs us support hours we do not have and, twice in
the past, a regulatory correction.

I have two testers, Aisha and Ben, and each of them has one 90-minute block
per day on Wednesday, Thursday and Friday. Six blocks total, and that is
firm - the rest of their week is release regression and support escalations.

The tax calculation engine is not ours to test. The payroll-core team owns
it, they have unit-level coverage on the rates and thresholds, and they have
asked us repeatedly to stop raising duplicates against it. We test what
sits around it: the year-end run itself, the filing submission, the
statement documents, the correction path, and the customer-facing screens.

Whatever we do Wednesday should change what we do Thursday. Last quarter
each block was planned in advance and by Friday two of them were pointless
because Wednesday had already answered the question. And at the end I need
something for the go/no-go on the Monday after - the release manager wants
one page, not six write-ups.

## Output Specification

Produce a single file: `docs/qa/year-end-campaign.md`.

It must contain:

1. A ranked list of candidate pieces of work, longer than six, each stated
   as an area, what it is worked with, and what it should tell us - ranked
   against the risk of a customer-visible year-end failure.
2. The allocation: which pieces fill the six blocks, who works each and on
   which day, and which candidates are explicitly not being done this time.
3. The rule for revising the ranking: what comes back from Wednesday that
   would change Thursday's or Friday's allocation, and who makes that call
   and when.
4. What each tester records inside a block and what they hand back at the
   end of it.
5. The one page for the release manager: what it aggregates across the six
   blocks, what decisions it is meant to support, and who owns each action
   that comes out of it.
6. The stopping condition for the campaign - what would make us say we have
   done enough, or that we need to escalate for more time.

Firm budget: six 90-minute blocks, two testers, Wednesday to Friday. Out of
scope: the tax calculation engine's rates and thresholds, performance and
load, and anything owned by the payroll-core team.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/year-end-scope.md ===============
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
