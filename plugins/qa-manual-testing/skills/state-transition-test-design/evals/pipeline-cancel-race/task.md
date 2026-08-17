# A cancelled pipeline run reported success

## Problem Description

Every push to a repository creates a run. The run waits in the queue until a
runner claims it, the runner provisions a machine, the job executes, and the
run finishes as succeeded or failed. Runs that sit in the queue too long give
up on their own, and a run that takes longer than its configured limit at any
point after being claimed is killed as timed out.

Cancelling is not instant. Pressing Cancel asks the runner to stop and the run
sits in a cancelling state until the runner acknowledges. The runner is often
mid-step when the request arrives and finishes whatever it was doing before it
notices; anything it sends us in that window is discarded, because a run the
user cancelled is a cancelled run and the build artefacts are thrown away.

Last week a user pressed Cancel and the run finished as succeeded, published
its artefacts, and promoted a build to staging that nobody had approved. The
logs show the cancel request and the runner's success report reaching our API
about a second apart. The team's first reaction was to write it up as a race
and ask for load testing.

What we actually have is a run lifecycle with nine states that has never been
tested as a lifecycle. The existing pack triggers a build and checks it goes
green, and triggers a failing build and checks it goes red.

## Output Specification

Produce `docs/pipeline-run-tests.md` containing:

1. The model the cases come from: for each state a run can be in, what each of
   the five things our API can receive does to it.
2. Numbered manual test cases with steps and per-step expected results, stated
   as what the run page and `GET /runs/{id}` show. A tester can trigger each
   input from the UI, the CLI, or by calling the runner callback endpoints
   directly with a token.
3. A short section on anything you decided these cases cannot settle, and what
   should happen to it instead.

Runner infrastructure, machine images, and log streaming are out of scope. Do
not write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/run-lifecycle.md ===============
# Pipeline run lifecycle

## States a run can hold

| State | Run page shows |
|---|---|
| Queued | "Waiting for a runner" |
| Provisioning | "Preparing machine" |
| Running | Live log output |
| Cancelling | "Cancelling..." with a spinner |
| Succeeded | Green tick, artefacts listed |
| Failed | Red cross, failing step highlighted |
| Cancelled | Grey circle, "cancelled by <user>" |
| TimedOut | Red clock, "exceeded 60 minutes" |
| Expired | Grey clock, "no runner picked this up" |

## Inputs the API receives

| Input | Source |
|---|---|
| runner-claims | Runner, `POST /runs/{id}/claim` |
| job-reports-success | Runner callback |
| job-reports-failure | Runner callback |
| cancel-requested | User, from the run page, the CLI, or the API |
| timeout-elapsed | Scheduler tick |

Five inputs. Everything else that touches a run is read-only.

## Rules

- A run waits in the queue until claimed, or gives up after 30 minutes there.
- A claimed run provisions a machine, then executes.
- A failure reported while provisioning is a provisioning failure and the run
  is failed. There is nothing to succeed at that point.
- A run past its 60 minute limit is killed, wherever it had got to.
- Cancelling asks the runner to stop and waits for it. Whatever the runner
  sends while we are waiting is discarded and the artefacts are thrown away.
- Cancel is offered on runs that are not finished.
- The five finished states are final. The run page is read-only and the
  artefact list, if any, does not change again.

## Internal note (scheduler team)

The scheduler tracks its own phases while a run is in Provisioning -
`pod-pending`, `image-pull`, `warm-pool-hit`, `node-bind` - none of which are
surfaced on the run page, in the API response, or in the CLI. They exist in
scheduler metrics only.
