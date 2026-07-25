# Gremlin advanced operations - attacks, Scenarios, Reliability Score, CI, compliance

Deep reference for the `gremlin-chaos` SKILL.md. Consult when picking a
specific attack, chaining attacks into a Scenario, wiring Gremlin into CI,
reading the Reliability Score, or satisfying an audit / compliance
requirement.

Per [gremlin-home][gh]:

[gh]: https://www.gremlin.com/

## Full attack table

Per [gremlin-home][gh] and the broader Gremlin docs, the four attack
classes expand into these individual attacks:

| Class       | Attack             | Effect                                   |
|-------------|--------------------|------------------------------------------|
| Resource     | CPU                | Spike CPU usage                          |
| Resource     | Memory             | Spike memory                              |
| Resource     | Disk I/O           | Spike disk I/O                            |
| Resource     | Disk space         | Fill disk                                  |
| Network      | Latency             | Inject latency                             |
| Network      | Packet loss         | Drop packets                                |
| Network      | DNS                 | DNS resolution failure                      |
| Network      | Blackhole          | Drop all packets to/from a target           |
| State        | Shutdown            | Reboot the host                             |
| State        | Process killer      | Kill a specific process                     |
| State        | Time travel         | Skew the system clock                       |
| Request     | Request injection    | Modify HTTP requests in flight             |

## Running an attack via the web UI

Web UI workflow:

1. Select target (host / container / service / Lambda).
2. Pick attack type.
3. Configure (e.g., latency 500ms; duration 5min).
4. Optionally schedule.
5. Click "Unleash."

The UI provides safety: blast-radius scoping, abort button,
notifications.

## Authoring a Scenario

A Scenario chains multiple attacks:

```yaml
# Pseudo-Scenario config (Gremlin's UI exports JSON; this approximates)
scenario:
  name: "Checkout resilience test"
  attacks:
    - type: latency
      target: { service: checkout }
      length: 5min
      latency: 500ms
    - type: packet-loss
      target: { service: payment }
      length: 5min
      loss-percent: 10
      delay-after-previous: 1min
  abort_conditions:
    - "Sentry error rate > 2%"
    - "Manual abort"
```

Scenarios match per the `chaos-experiment-author`
"vary real-world events" principle - combinations approximate real
incidents.

## Reliability Score

Per [gremlin-home][gh], Gremlin's differentiator is the
"Reliability Score" - "individual services" get scores "based on
dependency mapping, risk detection, and failure testing."

Score components (per Gremlin docs):

- **Resilience tests** passed: % of attacks the service survived
- **Dependency map**: service-to-service relationships
- **Detected risks**: configuration drift, hidden dependencies

A service moving from "untested" to "score 80" via passing
attacks creates an objective improvement signal.

## API + CI automation

Trigger an attack directly from the API:

```bash
curl -X POST "https://api.gremlin.com/v1/attacks/new" \
  -H "Authorization: Key $GREMLIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "command": {
      "type": "latency",
      "args": ["-l", "300", "-m", "500", "-c", "5", "-h", "^api\\.example\\.com$"]
    },
    "target": {
      "type": "Random",
      "containers": { "labels": { "app": "checkout" } }
    }
  }'
```

The API enables CI integration - trigger a saved Scenario, wait for it
to run, then evaluate a monitoring-driven verdict:

```yaml
- name: Trigger Gremlin scenario
  run: |
    curl -X POST "https://api.gremlin.com/v1/scenarios/${{ vars.SCENARIO_ID }}/runs" \
      -H "Authorization: Key ${{ secrets.GREMLIN_API_KEY }}"
- name: Wait + verdict
  run: sleep 600 && ./scripts/datadog-verdict.sh
```

## Compliance + audit

Gremlin's enterprise tier (per [gremlin-home][gh]'s positioning)
provides:

- Audit logs (who triggered what, when).
- RBAC at organization / team / role level.
- SOC 2 / FedRAMP / etc. compliance posture.

Important for regulated industries where audit is non-negotiable.

## References

- [gh][gh] - Gremlin overview: enterprise reliability platform,
  reliability scoring, multi-platform fault injection.
- `chaos-experiment-author` - methodology Gremlin Scenarios implement.
