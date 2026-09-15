# The four that came back - support lead's note, 2026-08-28

The rule has closed 38 tickets since 2026-07-15. Four were reported again by
customers, all within eleven days of being closed.

- **ENG-4115.** Deploy went green. The fix ships behind `import_v2`, which is
  still off in production and is scheduled for October. Nothing about the
  customer-visible behaviour changed on the day we closed it.
- **ENG-4130.** Deploy went green - for `notifications`. The fix is in `auth`,
  which had not deployed since the Tuesday before. The rule matched on the
  ticket's most recent successful deploy job, not on the service the fix
  touched.
- **ENG-4140.** Deploy went green and the fix is behind `reset_v3`, off in
  production. Same shape as ENG-4115.
- **ENG-4151.** Deploy went green and the change was live. It did not fix the
  defect - the double charge happens on a path the PR did not touch. Nobody
  tried the flow before or after.

Of the 34 that did not come back, 21 had an independent confirmation recorded
on them anyway, from someone other than the author, before the rule reached
them. The rule's contribution on those was to close a ticket that was already
confirmed.
