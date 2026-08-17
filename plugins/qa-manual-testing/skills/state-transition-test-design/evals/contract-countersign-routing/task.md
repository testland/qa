# Nobody can say what a contract does when the first approver clicks Approve

## Problem Description

Our contract tool routes a sales contract through internal approval before the
counterparty is allowed to sign it. A contract is written in draft, submitted
for review, reviewed by legal and finance, and then sent out for signature.

Two approvals are required before a contract is cleared for signature. Legal
and finance both sit on the reviewer list and either can go first. A reviewer
can instead ask for changes, which sends the contract back to the sender to
edit; when the sender submits it again the reviewers look at it fresh and both
have to approve once more, because whatever they approved before is not what
is now in the document. The sender can withdraw a contract while it is still
inside the company, which voids it.

Once both approvals are recorded the contract is cleared and goes out to the
counterparty. When the counterparty signs, the contract is executed and it is
binding on both sides - finance has been very clear that nothing in our tool
may take an executed contract back.

The last release shipped a bug where the first reviewer's approval cleared the
contract for signature on its own, and a customer signed a contract finance had
never seen. The test pack we had at the time had a case called "reviewer
approves contract" and it passed. We would like a pack where that could not
happen.

## Output Specification

Produce `docs/contract-approval-tests.md` containing:

1. The model the cases come from: for each status a contract can hold, what
   each thing that can happen to it does. Where the same action produces a
   different result depending on the circumstances, the model must show that
   as separate entries rather than one.
2. Numbered manual test cases, each a sequence of steps with the expected
   result after every step, including what the contract's status reads.
3. The preconditions each case needs, precisely enough that a tester can set
   the contract up before starting.

The e-signature vendor's own signing screens, PDF rendering, and email
delivery are out of scope. Do not write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/contract-routing.md ===============
# Contract routing - internal spec

## Statuses

| Status | Meaning |
|---|---|
| Draft | Being written by the sender. Not visible to reviewers. |
| InReview | With the reviewers. Approvals recorded so far are shown on the contract header. |
| ChangesRequested | Back with the sender to edit. |
| Approved | Cleared for signature and sent to the counterparty. |
| Signed | Executed by both sides. |
| Void | Withdrawn before execution. |

## Things that can happen to a contract

| Action | Who does it |
|---|---|
| submit-for-review | Sender |
| reviewer-approves | Any reviewer on the list (legal, finance) |
| reviewer-requests-changes | Any reviewer on the list |
| sender-withdraws | Sender or a sales manager |
| counterparty-signs | The counterparty, from the emailed link |

These five are the only actions the routing service handles. All five are
exposed as API endpoints and three of them (`reviewer-approves`,
`reviewer-requests-changes`, `counterparty-signs`) are also reachable from
links in notification emails, which reviewers open days later.

## Rules

- Two approvals are required. Approvals are counted on the contract record and
  shown in the header as "1 of 2 approvals".
- A reviewer may approve or request changes, not both, and may act only once
  per round.
- Requesting changes clears the approvals counted so far - the next round
  starts from zero.
- The sender may withdraw the contract at any point before it is executed.
- The counterparty is emailed a signing link only once the contract is
  cleared. The link stays live in their inbox afterwards.
- Executed contracts are read-only in the tool. Finance treats this as a
  compliance control.
