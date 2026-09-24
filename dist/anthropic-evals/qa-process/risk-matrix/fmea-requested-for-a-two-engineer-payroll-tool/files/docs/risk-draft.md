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
