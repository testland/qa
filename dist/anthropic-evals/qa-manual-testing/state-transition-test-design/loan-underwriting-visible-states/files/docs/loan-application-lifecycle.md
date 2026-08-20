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
