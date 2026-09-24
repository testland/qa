# Notes received ahead of the Q3 review

---

**From:** Dmitri Osei (engineering manager, platform)
**Date:** 2026-09-09
**Subject:** the admin import churn number, and the window

`admin.spec.ts > bulk-import-10k-rows` has cost my team more hours than any
other test this year and it keeps surviving the review. Two things.

**One: the churn number for it is simply wrong.** Your stats file has it at 2
PRs in the ninety days. Nine PRs touched that test inside your window and I
have listed all nine in the attachment with dates and numbers. Check it against
your own file if you do not believe me - the per-file total for
`admin.spec.ts` in that same export is 14, and the three rows you have for
that file add up to 7.

**Two: ninety days is the wrong window anyway.** Even at nine it reads as a
recent problem. Over twelve months it is fourteen PRs against a twelve-month
suite median of four, and that is the honest picture of what this test has cost
us. I have attached the twelve-month figures for the whole suite so you can run
it that way. I am not asking you to delete the test today, only to score it
under a window that shows what it actually is.

---

**From:** Nadia Brandt (payments tech lead)
**Date:** 2026-09-10
**Subject:** refund test tier, and the migration PRs

Two things from me as well.

**One: `orders.spec.ts > refund-to-original-method` is tiered wrong.** It is at
tier 2. That tier was set in March, when refunds could go back to store credit
and the original-method path was one option among several. Since the 2026-07-01
release it is the only route a refund can take for an EU account. Tier 4.

**Two: drop the churn on `orders.spec.ts` for this quarter.** The PRs against
that spec were the fixture migration, not the test being fragile. Counting
mechanical churn as maintenance cost punishes the teams who did the migration
work properly. I would rather not have my refund test dragged down the list by
a rename.
