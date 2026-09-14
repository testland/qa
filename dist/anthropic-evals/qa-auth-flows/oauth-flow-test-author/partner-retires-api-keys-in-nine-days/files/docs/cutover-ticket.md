# BILL-4417 — move billing-sync off the Northwind API key

Due **31 Oct**. Owner was @marcus (on leave from 22 Oct).

| Date | Note |
|---|---|
| 14 Oct | Northwind confirm the retirement date. No extension available. |
| 16 Oct | Captured their sandbox responses into `src/mockPartnerAuth.js`. |
| 20 Oct | @marcus starts `src/partnerToken.js`. |
| 21 Oct | @marcus: "cannot get a token out of it, leaving the three notes above" |
| 27 Oct | Northwind open their sandbox to us (after our freeze) |

The nightly run is how invoices reach the ledger. A missed night is recoverable
by hand; three missed nights is a finance escalation.
