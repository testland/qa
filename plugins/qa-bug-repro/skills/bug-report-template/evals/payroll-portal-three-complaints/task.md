# Office manager's email lists several things wrong with the payroll portal

## Problem Description

The office manager at one of our mid-size customers emailed her account manager
a list of things that are "broken" in the payroll portal. The account manager
forwarded it to us with "can you get this into the tracker today, she's
threatening to escalate".

The email is one block of prose covering what look like unrelated failures in
different parts of the product, each described in the level of detail you would
use with a colleague who already knows what you mean. Some of the pieces
contradict each other on when the trouble started.

Engineering triage will not accept a single item that spans several unrelated
areas — those get picked up by one owner, one piece gets fixed, and the rest
disappear when the item closes. Whatever we hand over has to survive that.

## Output Specification

1. Write `reports/palewell-hr-intake.md`.
2. The file must be the complete intake for this email — everything that will be
   entered into the tracker comes from it, and each thing entered has to be
   independently assignable to a different team.
3. Related items should point at each other so nobody loses the context that
   they arrived together.
4. The account manager will go back to the customer once, so the questions we
   need her to answer must be in the file, attached to the thing they belong to.

Out of scope: opening the tracker, investigating any of the failures, or writing
a reply to the customer.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/forwarded-email.md ===============
From:    Rachel Okonjo <r.okonjo@bramblewood-logistics.example>
To:      accounts@palewell-hr.example
Subject: Fwd: portal problems - need these sorted
Date:    2026-08-13 16:48 (+01:00)

Hi Tom,

Sorry to pile on but a few things are going wrong at once and payroll runs
Friday.

The main one is the export. When I download the payroll file for the finance
team the year-to-date column just isn't there any more. It used to be there. The
finance team can't reconcile without it and they've had to do last month by hand.

Also two of my team can't sign in at all — they put in their work email, it
takes them off to the sign-in page, and then it just dumps them back at our
login screen again. Round and round. Everyone else is fine. I've reset their
passwords twice.

And the reports page takes forever now. It's been like this since Monday, though
honestly it's never been quick since we came on board in June. I click into the
headcount report and go make a coffee.

Can you get someone to look before Friday please.

Rachel

--- account manager's note ---

Bramblewood Logistics, ~180 employees, on the Standard plan. Rachel is the only
admin. I didn't ask her anything else, sorry, I was on my way into a call.
She's on Windows at the office, don't know about the two who can't sign in.
