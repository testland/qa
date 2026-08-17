# Payroll rewrite sign-off: how many pay cases are there actually?

## Problem Description

We are moving weekly pay calculation off the old payroll product and the rules
extract below is what the new calculation implements. The works council has to
sign the test evidence, and their question at the last meeting was the one I
could not answer: how do we know the test list covers everything, rather than
covering the examples someone happened to think of?

Five things about an employee and their week appear in the extract. Some of them
plainly do nothing for part of the workforce - there are premiums in here that
salaried staff never receive - so the honest number of cases is smaller than the
number of ways those five things can be arranged, and I need both numbers and
the step from one to the other written down.

There is also at least one week the extract does not price. It came up in the
pilot payroll run and the payroll lead resolved it on the spot; I want it back
on the page as an open item, because whatever she decided is not in the text and
the next person will decide it differently.

## Output Specification

Produce `overtime-rules-analysis.md` containing:

1. The five things about an employee and their week that the extract turns on,
   one per line.
2. How many different weeks those five things can describe in total.
3. A table of the genuinely different pay cases, with the pay treatment for
   each, and a sentence saying how you got from the number in point 2 to the
   number of rows in this table - naming which of the five stops mattering for
   which group.
4. Any week the extract does not price, raised as an open item rather than
   priced with something plausible.
5. The list of weeks QA should run through the calculation, with a count, and a
   statement of what that count covers.

Out of scope: tax, social contributions, holiday accrual carry-over between
years, and part-time pro-rating. Gross pay treatment only.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/weekly-pay-rules.md ===============
# Weekly pay rules (extract, works agreement 2026)

Hourly employees are paid 1.5x their base rate for hours worked over 40 in a
week.

Salaried employees do not receive overtime pay. They accrue time off in lieu at
1x for hours worked over 40.

Work on a public holiday is paid at 2x for hourly employees. Salaried employees
receive a day in lieu instead.

A shift that starts after 22:00 carries a night premium of EUR 4 per hour for
hourly employees. Salaried employees receive no night premium. The night premium
is added to whatever hourly rate applies to those hours.

Union members are paid 2.5x rather than 2x for work on a public holiday. This
applies to hourly employees only.

Union membership changes nothing else about pay.

Salaried entitlements accrue independently: a salaried employee can accrue both
time off in lieu and a day in lieu in the same week.
