# A payroll failure at step 19 cost us two days

## Problem Description

`tests/TC-88-payroll-run.md` is the case we run before every payroll release. It
is thirty-four steps long and it covers, in one pass, an ordinary monthly run
plus a mid-month joiner, a leaver, an employee with a court-ordered deduction,
and a bonus payment.

Last month it failed at step 19. It took two days to work out what had actually
broken, because step 19 reads a figure produced back at step 9, and nobody could
establish whether the deduction set up at step 12 had been applied at all. In the
end the defect was in the leaver calculation, which is a completely different
part of the product from the step that reported the failure.

The case also cannot be picked up halfway. A tester who only has an hour cannot
run the bonus part, because the bonus steps sit on top of a pay run committed
twenty steps earlier. And two testers cannot work on it at the same time.

We want the same coverage arranged so that one red result points at one
behaviour, and so that any part of it can be run on its own, in any order, by
someone who has not run the others.

## Output Specification

Produce one markdown document at exactly `tests/payroll-run-scripts.md`
containing:

1. The same coverage, restructured so that a failure identifies a single
   behaviour.
2. A summary table at the top listing each part with its identifier, what it
   covers, and roughly how long it takes.
3. For each part, everything that must be true before its first step, using the
   employees and pay periods in the attached data file - no part may depend on
   another part having been run first.
4. For each step, the one figure or screen state that decides pass or fail.
5. Whatever is needed so the same part can be run again next week without a
   tester having to clean up by hand or guess.
6. A place to record failures.

Out of scope: automating any of this, and changing how payroll calculates
anything.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/TC-88-payroll-run.md ===============
# TC-88 - Monthly payroll run

Preconditions: payroll is set up.

1. Log in to payroll.
2. Open the current pay period.
3. Check the employee list loads.
4. Check the headcount.
5. Click Calculate.
6. Wait for the calculation to finish.
7. Check the gross total.
8. Open the first employee's payslip.
9. Note the net pay figure.
10. Go back to the list.
11. Open the new starter added this month.
12. Add the court order from the HR ticket.
13. Recalculate.
14. Check the new starter's payslip is pro-rated.
15. Check the pro-rata days.
16. Open the leaver.
17. Check the final pay includes holiday accrual.
18. Check the P45 flag is set.
19. Compare the net pay to the figure from step 9.
20. Add the bonus for the sales team.
21. Recalculate.
22. Check the bonus is taxed.
23. Check the bonus shows as a separate line.
24. Commit the pay run.
25. Check the run status is Committed.
26. Download the bank file.
27. Check the bank file totals.
28. Check the journal export.
29. Check the payslips are published to the employee portal.
30. Check the leaver cannot see next month.
31. Repeat step 14 for the second new starter.
32. Check the deduction schedule for the court order.
33. Check the audit trail.
34. Log out.

=============== FILE: tests/payroll-test-data.md ===============
# Payroll UAT data

Environment: https://payroll-uat.harborpay.example
Tester login: `qa.payroll@harborpay.example` (role: Payroll Administrator).
A Payroll Approver login `qa.approver@harborpay.example` is required to
commit a run; the Administrator role cannot commit on its own.

## Seeded employees (company `HARBOR-UK`)

| Ref    | Name           | Situation                                              |
|--------|----------------|--------------------------------------------------------|
| E-1001 | Priya Nair     | Salaried, 3,400.00 GBP/month, unchanged for a year      |
| E-1002 | Owen Fletcher  | Started 14 March 2026, salaried 2,800.00 GBP/month      |
| E-1003 | Dana Whitmore  | Leaving 21 March 2026, 6.5 days holiday accrued         |
| E-1004 | Sam Okafor     | Court order GARN-77, 15% of net, effective 1 March 2026 |
| E-1005 | Lena Fischer   | Sales, 1,000.00 GBP bonus approved for March            |

## Pay periods

| Period    | State                                              |
|-----------|----------------------------------------------------|
| 2026-01   | Committed - locked, cannot be reopened              |
| 2026-02   | Committed - locked, cannot be reopened              |
| 2026-03   | Open                                                |
| 2026-04   | Open                                                |
| 2026-05   | Open                                                |

A period can be committed exactly once. Committing 2026-03 makes it
permanently unavailable for another run. Support can clone the company into
a fresh sandbox (`HARBOR-UK-<yourname>`) on request, which restores all five
employees and reopens 2026-03; the clone takes about ten minutes.

## Expected values published by Finance for March 2026

| Ref    | Expected gross | Expected note                                    |
|--------|----------------|--------------------------------------------------|
| E-1001 | 3,400.00       | full month                                        |
| E-1002 | 1,625.81       | 18 of 31 days                                     |
| E-1003 | 2,910.00       | includes 6.5 days holiday accrual                 |
| E-1004 | 2,200.00       | deduction applied to net, not gross               |
| E-1005 | 3,100.00       | 2,100.00 salary + 1,000.00 bonus                  |
