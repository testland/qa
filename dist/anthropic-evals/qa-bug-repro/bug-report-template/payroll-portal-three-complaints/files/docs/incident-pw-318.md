# PW-318 - two payroll cycles run on incorrect year-to-date figures

**Customer:** Dunmore Freight (Standard plan, legacy pricing, 96 employees)
**Cycles affected:** 2026-04-30 and 2026-05-29. 192 payslips restated. Customer had to
amend its own filing.

## How it was classified

The payroll squad was six weeks into a pilot of the single-urgency intake when the
defect was reported on 2026-04-24. It was logged **P3**. The filer's note reads:
"one customer, legacy plan, we have a release going out Friday".

Under the definitions in clause 7.2 the defect is **Critical** - payroll output was
incorrect - which owes a 4 business hour acknowledgement and a workaround inside 1
business day. Nothing in the record contradicts that. The problem is that once the
single field was set to P3 there was no longer a field in which the Critical
classification could exist, so the contractual clock was never started. The customer
was acknowledged on day 9.

The P3 itself was a defensible scheduling call at the time. One customer out of 214,
on a plan being retired, against a release the squad had already committed to.

## Actions

1. Pilot ended; squad returned to the two-field intake. **Done.**
2. Restore an impact classification that is recorded and scored independently of the
   queue position, so the response clock can be driven by the first and the work order
   by the second. **Open - no owner.**
3. Rework the year-to-date accumulator. **Done, shipped 5.1.2.**
