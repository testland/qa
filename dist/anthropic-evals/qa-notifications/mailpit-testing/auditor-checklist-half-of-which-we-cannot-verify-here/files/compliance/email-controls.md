# Email controls — external audit, cycle 2026-Q3

Evidence required: automated and repeatable. Screenshots are not accepted for
this cycle.

| # | Control |
|---|---|
| C1 | Every bulk message carries a `List-Unsubscribe` header and a visible unsubscribe link in the body. |
| C2 | Unsubscribing completes in a single action with no login, and the recipient's subscription state is updated as a result. |
| C3 | Every message is sent with both an HTML part and a plain-text alternative. |
| C4 | Every outbound message carries a valid DKIM signature. |
| C5 | The `Return-Path` on outbound mail is SPF-aligned with the sending domain. |
| C6 | DMARC evaluation passes for the sending domain. |
| C7 | A hard bounce marks the recipient undeliverable and suppresses further sends to that address. |
| C8 | The digest renders without layout breakage in Outlook 2019, Gmail web and Apple Mail. |

Auditor's note: controls are equally weighted. A control with no evidence is a
finding; a control with evidence the tester cannot explain is also a finding.
