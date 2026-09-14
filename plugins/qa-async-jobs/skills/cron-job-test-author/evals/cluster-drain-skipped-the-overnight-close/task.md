# Platform wants one scheduling policy signed off for all three workloads

## Problem Description

On 1 September the platform team drained the node pool for a patch upgrade
between 01:40 and 02:05 UTC. The monthly `close-books` run never happened. No
alert, no failed Job object, nothing in the dashboard - the controller simply did
not create the Job, and we found out on the 10th when Accounting asked where the
August close was. The manifests have not been touched since March.

Out of that, platform has drafted one scheduling standard to apply to every
CronJob in the cluster. It is in `ops/proposed-policy.md` and they want it signed
off so they can raise a single PR against all three manifests. The reasoning in
it is not silly and the person who wrote it has been carrying this incident for a
fortnight.

I am not signing something off because it reads as safer than what we have now.
Go through the draft properly, decide what you would actually apply and to which
workload, and change only what you can defend to the team that owns the job.

The three manifests are in `k8s/`, the cluster's own notes are in
`ops/cluster.md` - including the requirement each owning team gave us, which is
the closest thing we have to a spec - and the incident write-up is in
`ops/incident-5503.md`.

## Output Specification

1. Edit the manifests under `k8s/` to whatever you sign off on, and leave every
   field you are not acting on exactly as it is.
2. Write `docs/scheduling-review.md`. Answer the draft point by point: for each
   of its three proposals, whether it should apply to each workload, and why.
   Then, per workload: what should happen when a scheduled run is missed, what
   should happen when a run is still going when the next one is due, which field
   on the object implements each decision, and the value you set.
3. In the same document, say what would have made the September miss visible
   inside a day rather than in nine, given what the cluster already alerts on.

## Input Files

Extract the following files before beginning.

=============== FILE: k8s/close-books.yaml ===============
apiVersion: batch/v1
kind: CronJob
metadata:
  name: close-books
  namespace: finance
  labels:
    owner: finance-eng
spec:
  schedule: "0 2 1 * *"
  startingDeadlineSeconds: 120
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: close
              image: registry.internal/finance/close-books:2026.08.3
              args: ["--period", "previous-month"]
              resources:
                requests:
                  cpu: "2"
                  memory: 6Gi

=============== FILE: k8s/promo-blast.yaml ===============
apiVersion: batch/v1
kind: CronJob
metadata:
  name: promo-blast
  namespace: growth
  labels:
    owner: growth-eng
spec:
  schedule: "30 9 * * 2"
  timeZone: "America/Chicago"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: blast
              image: registry.internal/growth/promo-blast:2026.07.9
              args: ["--segment", "weekly-active"]
              resources:
                requests:
                  cpu: "1"
                  memory: 2Gi

=============== FILE: k8s/warehouse-compact.yaml ===============
apiVersion: batch/v1
kind: CronJob
metadata:
  name: warehouse-compact
  namespace: platform
  labels:
    owner: platform
spec:
  schedule: "0 * * * *"
  startingDeadlineSeconds: 900
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: compact
              image: registry.internal/platform/warehouse-compact:2026.08.1
              args: ["--partitions", "orders,events"]
              resources:
                requests:
                  cpu: "4"
                  memory: 16Gi

=============== FILE: ops/proposed-policy.md ===============
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
   Patch upgrades run inside a 09:00-15:00 maintenance window and a drain takes
   20 to 40 minutes, so six hours of grace means a maintenance window can never
   skip a run again. INC-5503 was a 120-second deadline against a 25-minute
   drain.

3. Alert on Job failure for all three workloads, routed to the owning team.
   We already have that alert and it is only wired to platform's pager today.
   Turning it on per owner closes the gap INC-5503 opened.

- platform-lead

=============== FILE: ops/cluster.md ===============
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

=============== FILE: ops/incident-5503.md ===============
# INC-5503 - August close did not run

- 2026-09-01 01:40 UTC - node pool `pool-b` cordoned and drained for the 1.29.4
  patch. Pool back in service 02:05 UTC.
- 2026-09-01 02:00 UTC - `close-books` schedule time. No Job object was created.
  Controller logged that the start time had been missed.
- 2026-09-01 .. 2026-09-10 - nothing. The CronJob object itself looked healthy;
  its last successful run timestamp was simply the month before.
- 2026-09-10 - Accounting asked for the August close. Run by hand at 2026-09-10
  16:20 UTC, took 3h04m, output accepted after Finance checked the figures by
  hand.
