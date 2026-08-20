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
