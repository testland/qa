# prod-us-east cluster notes

- Control plane v1.29.4, four node pools, managed upgrades.
- The control plane and every node run UTC.
- Node pools are drained for patch upgrades roughly monthly. A drain takes 20-40
  minutes; nothing in the namespace is scheduled while the pool is out.
- Alerting in place today: pod crashloop, Job failure, node memory pressure,
  node disk pressure. All four route to platform's pager. Nothing else is wired
  up.
- `src/controller.js` is platform's model of the controller. It is what we sign
  scheduling changes off against, because we are not rehearsing a month boundary
  or a drain on the live cluster.

## What each owning team asked for

| Workload | Owner | Their words |
|---|---|---|
| close-books | finance-eng | "It has to run every month, no exceptions. A close that lands a few hours late is an annoyance. A close that does not land is a restatement and a conversation with the auditor. The accounting period is the calendar month in America/New_York, and `--period previous-month` closes whichever month had ended when the run started." |
| promo-blast | growth-eng | "240,000 recipients. The segment is frozen at 09:00 on the Tuesday morning and the 09:30 slot is the one we tested with the mail vendor and the unsubscribe desk. A send that leaves hours after the segment was built is not the send we tested." |
| warehouse-compact | platform | "Rebuilds the orders and events partitions in place from source. A pass takes 70 to 110 minutes depending on the day's volume and it rewrites the same two partitions every time." |
