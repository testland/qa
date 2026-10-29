# Lifecycle coverage matrix and v1 -> v2 upgrade-path spec

Companion detail for `service-worker-lifecycle-tests`: the coverage
matrix, and where the upgrade-path test lives.

## Coverage matrix

`tests/sw-lifecycle-coverage.yaml` maps each spec to its state-machine cell.
CI gates on every matrix row having at least one passing test.

```yaml
# tests/sw-lifecycle-coverage.yaml
matrix:
  fresh_install:
    test: "first install reaches activated"
    states: [installing, installed, activating, activated]
    ref: sw-spec ServiceWorkerState enum
  waituntil:
    test: "waitUntil holds the install phase"
    states: [installing]
    ref: mdn-sw waitUntil
  upgrade:
    test: "v1 to v2: skipWaiting + claim flip the controller and clean caches"
    states: [installed, activating, activated, redundant]
    events: [updatefound, statechange]
    ref: mdn-skipwaiting, mdn-claim
  # add when the worker omits a call (SKILL.md Steps 4-5):
  # waiting_without_skipwaiting, uncontrolled_without_claim
```

## Worked example: the v1 -> v2 upgrade-path test

The upgrade test is the third test in SKILL.md Step 3, run against the
fixture server in [test-fixtures.md](test-fixtures.md). It covers
`updatefound`, v1 `activated → redundant`, the controller switching to
v2 (`skipWaiting` + `clients.claim`), and v2's `activate` handler
deleting every cache except `app-v2`. Steps 4-5 give the expectations
for workers that skip one of the two calls.

Source references:

- sw-spec: https://w3c.github.io/ServiceWorker/
- mdn-sw: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- mdn-skipwaiting: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
- mdn-claim: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
