# prod-us-east cluster notes

- Control plane v1.29.4, four node pools, managed upgrades.
- The control plane and every node run UTC. A schedule with no zone on the
  object is evaluated in UTC.
- Node pools are drained for patch upgrades roughly monthly. A drain takes
  20-40 minutes; pods are evicted and rescheduled once the pool is back.
- Alerting in place today: pod crashloop, Job failure, node memory pressure,
  node disk pressure. All four route to platform's pager. Nothing else is wired
  up.

## What each owning team asked for

| Workload | Owner | Their words |
|---|---|---|
| close-books | finance-eng | "It has to run every month, no exceptions. A close that lands a few hours late is an annoyance. A close that does not land is a restatement and a conversation with the auditor. The accounting period ends at midnight America/New_York on the last day of the month and the close reads the period that has just ended - it cannot run before the period is over." |
| promo-blast | growth-eng | "240,000 recipients. The 09:30 Tuesday slot is the one we tested. The one time a send went out at 16:40 by mistake we took 900 unsubscribes off it and the click rate was a third of a normal week." |
| warehouse-compact | platform | "Rebuilds the orders and events partitions in place. A pass takes 70 to 110 minutes depending on the day's volume and it rewrites the same partitions every time. There is no resume: a pass that stops part way leaves the partitions in whatever state it had got to, and the next pass starts from the beginning." |
