# Two engineers, a SOC 2 audit in eight weeks, and a slide deck full of risk numbers

## Problem Description

I run Fernhill (nine people, two of them engineers). We sell one thing: a payroll
export tool that takes a customer's payroll run and produces the bank file and the
tax filing extract. About 140 small businesses use it.

Our SOC 2 Type II window opens on 2026-11-01 and the auditor has asked for a
documented risk assessment. What we have is slide 14 of the customer deck, which
Mireille and I filled in one evening in February. I have exported it for you as
`docs/risk-draft.md`.

I have been reading about this and FMEA looks like the real thing - severity times
occurrence times detectability, numbers up to 1000, every failure mode ranked. That
is clearly more rigorous than the eight rows we have. Build that out properly across
the whole product so the auditor sees something serious, and keep it on slide 14 of
the deck because that deck is what we actually put in front of auditors and
prospects - I do not want the assessment living somewhere nobody opens.

Separately: LedgerLine have quoted us for their managed file-delivery service, which
would take the export-corruption problem off us. I need to decide buy or don't-buy
before the audit window opens and I want that argued in money, not in scores. Our
incident history and their quote are attached.

## Output Specification

1. Produce the documented risk assessment the auditor asked for, covering all eight
   risks in the draft, at whatever path and in whatever form you think it should
   live in.
2. Produce the LedgerLine buy / don't-buy argument with the arithmetic shown.
3. Write a short reply to me explaining anything you did differently from what I
   asked for, and why.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/risk-draft.md ===============
# Fernhill risk assessment - exported from customer deck slide 14

Filled in 2026-02-19 by Yusuf Adeyemi and Mireille Fontaine. Not updated since.

Scale: impact 1-5, likelihood 1-5, score is impact times likelihood.

| ID  | Risk                                                      | Category   | Impact | Likelihood | Score | Owner     |
|-----|-----------------------------------------------------------|------------|-------:|-----------:|------:|-----------|
| D-1 | Payroll export file corrupted between us and the bank     | Technical  |   5    |     5      |  25   | Yusuf     |
| D-2 | Wrong tax year applied to an export                        | Business   |   4    |     4      |  16   | Mireille  |
| D-3 | Employee national insurance numbers written to app logs    | Security   |   5    |     5      |  25   | Yusuf     |
| D-4 | Customer admin can open another tenant's payroll run       | Security   |   5    |     5      |  25   | Yusuf     |
| D-5 | Export silently truncates runs over 500 employees          | Business   |   3    |     3      |   9   | Mireille  |
| D-6 | Bank sort-code validation missing on manual entry          | Business   |   4    |     4      |  16   | Mireille  |
| D-7 | Nightly job skips a run across the DST boundary            | Technical  |   2    |     2      |   4   | Yusuf     |
| D-8 | Auditor cannot retrieve who approved a payroll run         | Regulatory |   4    |     3      |  12   | Mireille  |

No mitigations column yet. Nothing here has been reviewed since February.

=============== FILE: data/incident-history.md ===============
# Fernhill incident log - 2024-11 to 2026-05 (18 months)

| Date       | What happened                                                     | Class            | Total cost to us |
|------------|-------------------------------------------------------------------|------------------|-----------------:|
| 2025-03-14 | Bank file truncated in transit; 62 employees unpaid for two days  | File corruption  |         $11,200  |
| 2025-11-02 | Customer entered the wrong pay period; we re-ran the whole cycle  | Upstream data    |          $4,800  |
| 2026-04-19 | Bank file checksum mismatch; re-issued, one customer credited     | File corruption  |          $8,900  |

Cost lines include engineering time at $95/hr, customer credits, and the
re-run fees our banking partner charges.

No other incident classes have occurred in the window.

=============== FILE: vendor/ledgerline-quote-2026-05-28.md ===============
# LedgerLine Managed File Delivery - quote for Fernhill

Prepared 2026-05-28. Valid 90 days.

| Line                                                    | Cost              |
|---------------------------------------------------------|-------------------|
| One-time migration and integration                       | $18,000           |
| Managed delivery subscription                            | $2,400 per year   |

## What the service covers

Checksum-verified, resumable delivery of generated payroll files to partner banks,
with automatic re-issue on a failed checksum. LedgerLine warrants delivery integrity
end to end once the file leaves your generator.

## What the service does not cover

Anything upstream of file generation. If the payroll data handed to the generator is
wrong - wrong pay period, wrong tax year, wrong employee set - LedgerLine will
deliver that file intact and on time. Data correctness remains the customer's
responsibility.

=============== FILE: notes/auditor-email-2026-05-30.md ===============
From: Dolores Kwan, Meridian Assurance
Subject: SOC 2 Type II - readiness items

Fernhill items still outstanding for the 2026-11-01 window:

- A documented risk assessment covering the product's material risks, with an
  owner recorded against each one, dated, and demonstrably reviewed on a stated
  cadence during the observation period.
- Evidence the assessment is maintained rather than produced once for us. We will
  ask to see the change history at the interim checkpoint.
- Accepted risks need a written acceptance rationale.

We do not prescribe a method or a template. Use whatever your team will actually
keep current.
