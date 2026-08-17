# Claims keep landing in the wrong queue and the ops note does not settle it

## Problem Description

Motor claims arrive through the web form and are routed automatically. The ops
note below is what the routing was built from. It reads as four independent
statements, and the statements overlap: last week a EUR 4,000 claim on a
policy opened five weeks ago went to the adjuster, and fraud review escalated
it because they say it was theirs.

There is a second problem. The claim form only renders the police-report
upload above a certain claim value, so some of the states this note describes
cannot actually be produced by a customer. Our tester wasted an afternoon
trying to set one of them up before someone told him.

I need one document for the triage review. It should say what every possible
state of the inputs does, which states our tester genuinely cannot reproduce,
and which ones the note fails to settle.

## Output Specification

Produce `claim-routing-analysis.md` containing:

1. The inputs that decide where a claim goes, one per line, each phrased so a
   tester can set it on its own.
2. Every distinct routing result and service-level result the note produces,
   listed separately.
3. A table giving the expected result for every possible state of those inputs.
4. Any state a tester will not be able to reproduce on the real system, plus
   how you would confirm the system actually prevents it.
5. Any state whose result the note does not settle, written up as an open
   question rather than filled in with your best guess.
6. The cases QA should run.

Out of scope: the adjuster's internal workflow, the fraud scoring model, and
any code change. This is a review document only.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/claim-triage-note.md ===============
# Motor claim triage (ops note)

A claim is approved automatically when all of these hold: the claim amount is
EUR 1,000 or less, the policy has been active for six months or more, and at
least one damage photo is attached.

A small claim on an established policy with no photo attached is held, and the
customer is emailed to ask for a photo.

Claims above EUR 1,000 go to a human adjuster.

Claims on a policy that has been active for less than six months go to fraud
review.

Photos are advisory for an adjuster - the adjuster opens the file either way,
and their presence or absence changes nothing about the adjuster's handling.

The police-report upload appears on the claim form only for claims above
EUR 1,000. Below that the field is not rendered at all, so a small claim never
arrives carrying a report.

Where a police report is attached, the adjuster is expected to close the claim
within two working days instead of the usual five.
