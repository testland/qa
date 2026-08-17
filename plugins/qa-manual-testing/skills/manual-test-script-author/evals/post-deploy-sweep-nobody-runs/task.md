# The post-deploy sweep has grown until nobody runs it

## Problem Description

We deploy the payments dashboard on Tuesdays and Thursdays. The engineer on call
is supposed to walk the wiki page `wiki/deploy-smoke.md` afterwards. In the last
eleven deploys it was walked twice. Both times it took the engineer close to
fifty minutes, and on one of them they were interrupted at item 19 and never went
back.

The page has accumulated for two years. It is one long undivided list, several
entries are small projects in their own right, and a good number tell the
engineer to look at something without saying what a good result looks like. One
entry cannot be completed at deploy time at all.

There is a second problem that only showed up after the January incident. The
page is edited in place by whoever ran it last, so when we tried to establish
what had actually been verified on the afternoon the outage began, there was no
record - only the current version of the page. Two earlier attempts at a shorter
list are sitting in `docs/checklists/` as `prod-smoke-v1.md` and
`prod-smoke-v2.md`; leave both alone.

What we want is a sweep the on-call can genuinely finish before the deploy
window closes, and a completed run that is still readable six months later.

## Output Specification

Produce one markdown document at exactly `docs/checklists/prod-smoke-v3.md`
containing:

1. A sweep an on-call engineer can complete in fifteen minutes or less,
   organised so they can see where they are.
2. A stated time allowance for each section and for the whole run.
3. Each entry short enough to scan in one line, naming what the engineer does and
   the specific thing that tells them it is fine, using the accounts and data in
   the attached files.
4. Header fields that make a completed run an auditable record of a particular
   deploy.
5. Somewhere to record what failed.
6. A short statement of what this sweep deliberately does not cover, so nobody
   reads a green run as more than it is.

Out of scope: automating any of it, editing the wiki page, and touching
`prod-smoke-v1.md` or `prod-smoke-v2.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: wiki/deploy-smoke.md ===============
# Deploy smoke

Edited by whoever ran it last. Keep it current.

1. Check the homepage loads.
2. Log in.
3. Check the dashboard.
4. Check the balance widget.
5. Check the transactions table.
6. Filter transactions by date and check it works.
7. Search a transaction by reference.
8. Open a transaction detail page.
9. Check the refund button is there.
10. Issue a refund on a recent live transaction and confirm the customer is
    credited. Then contact the customer's bank if the credit has not landed,
    and note the case number in the deploy channel.
11. Check the payouts page.
12. Check the payout schedule is right.
13. Wait for the nightly settlement batch and confirm yesterday's payouts
    reconcile to the ledger.
14. Check the merchant switcher.
15. Switch merchants and check data changes.
16. Check the notifications bell.
17. Mark a notification read.
18. Check the reports page loads.
19. Run all twelve report types. For each one, export to CSV, XLSX and PDF,
    open the file, and confirm the totals in the footer match the totals on
    screen. Then re-run each with the comparison period enabled and confirm
    the delta column is populated.
20. Check the API keys page.
21. Rotate an API key.
22. Check webhooks are delivering.
23. Replay a failed webhook.
24. Check the team members page.
25. Invite a team member.
26. Check the invite email arrives.
27. Remove the team member.
28. Check the audit log.
29. Check the billing page.
30. Download an invoice.
31. Check the support widget opens.
32. Check the status banner is not showing.
33. Check mobile layout looks OK.
34. Check dark mode looks OK.
35. Log out.
36. Check the marketing site header links back to the app.

=============== FILE: docs/prod-accounts-and-data.md ===============
# Production verification accounts

The on-call uses a ring-fenced sandbox merchant that sits in production but
settles to a dummy ledger. Nothing done under it moves real money, and
nothing outside it should be touched during a deploy sweep.

| Item              | Value                                             |
|-------------------|---------------------------------------------------|
| Login             | oncall.smoke@paylane.example                      |
| Password          | 1Password entry `prod-smoke-login`                |
| Merchant          | `Sandbox Merchant (SBX-9)` in the merchant switcher|
| Second merchant   | `Sandbox Merchant (SBX-10)` - for switcher checks |
| Known transaction | reference `TXN-SBX-000117`, 42.00 USD, settled    |
| Known payout      | `PO-SBX-0042`, 1,204.75 USD, status Paid          |
| Report to spot-check | "Daily settlement" - has data every day        |
| Notification inbox| oncall.smoke@paylane.example (real mailbox)       |

The release version is printed in the footer of every page as `build: <sha>`
and is also on the deploy message in #deploys.

The nightly settlement batch runs at 02:10 UTC. Nothing that depends on it
can be verified during a daytime deploy.

Refunds on the sandbox merchant are safe. Refunds on any other merchant are
real customer money.
