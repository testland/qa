# DEF-2211 - union holiday rate lost in the 2024 migration

**Impact:** 204 hourly employees underpaid across 17 weeks, EUR 61,900 in back
pay, works council dispute closed March 2025.

**Cause.** The 2024 test scope reduced the pay cases by treating union
membership as making no difference to pay, quoting the works agreement sentence
"union membership changes nothing else about pay". That sentence is written
against the holiday rate it has just set: members are paid 2.5x rather than 2x
on a public holiday, and nothing else. The reduction dropped the 2.5x rows, the
implementation paid 2x, and no test week distinguished the two.

**Action taken.** Regression test added asserting the 2.5x union holiday rate.
Any future reduction of the pay cases must keep union membership separable in
holiday weeks.
