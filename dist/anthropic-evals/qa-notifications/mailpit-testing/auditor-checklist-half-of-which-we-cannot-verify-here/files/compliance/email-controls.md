# Email controls — external audit, cycle 2026-Q3

Evidence required: automated and repeatable. Screenshots are not accepted for
this cycle.

| # | Control |
|---|---|
| C1 | A recipient can stop receiving these messages in one step, including when the recipient's mailbox provider performs the opt-out on their behalf, and our records reflect the opt-out. |
| C2 | A recipient whose gateway removes rich content still receives the full content of the message. |
| C3 | Outbound mail is cryptographically signed for our sending domain and passes the receiving provider's domain-policy evaluation. |
| C4 | An address the provider reports as permanently undeliverable is not sent to again. |
| C5 | Evidence is produced by exercising the message as the recipient receives it, not by inspecting the code or the configuration that produced it. |

Auditor's note: controls are equally weighted. A control with no evidence is a
finding; a control with evidence the tester cannot explain is also a finding.
