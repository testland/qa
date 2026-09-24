# Draft: one scheduling policy for prod-us-east

INC-5503 happened because the three CronJobs in this cluster were configured by
three different people at three different times and nobody owns the defaults.
One standard applied to all three gets us out of that. I will raise a single PR
once this is signed off.

1. `concurrencyPolicy: Replace` on every CronJob.
   If a run is still going when the next one is due, the newer run has the newer
   data and the older one is already behind. Replacing it is simpler than
   queueing and it stops a slow night turning into a pile-up.

2. `startingDeadlineSeconds: 21600` on every CronJob.
   A drain takes 20 to 40 minutes, so six hours of grace means a maintenance
   window can never skip a run again. INC-5503 was a 120-second deadline against
   a 25-minute drain.

3. Alert on Job failure for all three workloads, routed to the owning team.
   We already have that alert and it is only wired to platform's pager today.
   Turning it on per owner closes the gap INC-5503 opened.

- platform-lead
