# BILL-4417 — move billing-sync off the Northwind API key

Due **31 Oct**. Owner was @marcus (on leave from 22 Oct).

| Date | Note |
|---|---|
| 14 Oct | Northwind confirm the retirement date. No extension available. |
| 17 Oct | Security review. Portal credentials for `billing-sync` regenerated. |
| 18 Oct | Re-captured their sandbox into `src/mockPartnerAuth.js`. |
| 20 Oct | @marcus starts `src/partnerToken.js`. |
| 21 Oct | @marcus: "cannot get a token out of it", leaves the three notes above. |
| 24 Oct | **Our change freeze.** Anything needing Northwind takes 3 working days. |
| 27 Oct | Northwind open their sandbox to us. |
| 31 Oct | API keys stop working. |

The nightly run reads the ledger and posts the day's invoices. A missed night
is recoverable by hand; three missed nights is a finance escalation.
