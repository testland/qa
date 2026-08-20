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
