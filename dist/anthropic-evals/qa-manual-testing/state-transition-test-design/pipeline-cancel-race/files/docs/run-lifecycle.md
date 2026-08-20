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
