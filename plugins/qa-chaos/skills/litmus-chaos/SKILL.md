---
name: litmus-chaos
description: "Configures LitmusChaos for Kubernetes-native chaos engineering - installs via Helm, picks ChaosExperiments from the ChaosHub (`pod-delete`, `network-latency`, `node-cpu-hog`, etc.), authors a ChaosEngine CR scoping the experiment + steady-state probes, runs as part of the cluster, exports Prometheus metrics for the verdict. Use when the platform is Kubernetes (CNCF-hosted; cloud-native). Prefer over chaos-mesh when the team wants a ChaosCenter web UI for workflow scheduling and ChaosHub catalog browsing; use chaos-mesh for fine-grained network-fault policies via its own CRD family."
---

# litmus-chaos

## Overview

Per [litmus-home][lh]:

[lh]: https://litmuschaos.io/

> "**LitmusChaos** is a CNCF-hosted, open-source Chaos Engineering
> platform that helps teams identify infrastructure weaknesses
> through safe, controlled chaos tests."

> "Kubernetes developers & SREs use Litmus to manage chaos in a
> declarative manner." ([litmus-home][lh])

The architecture: Litmus runs as a Kubernetes operator; experiments
are CRDs; results export to Prometheus.

## When to use

- The platform is Kubernetes (Litmus is K8s-native).
- The team wants CNCF / open-source chaos tooling (vs commercial
  Gremlin).
- A chaos experiment's outcome should integrate with existing K8s
  observability (Prometheus, Grafana).

## Step 1 - Install

Per [litmus-home][lh]:

```bash
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm install litmuschaos litmuschaos/litmus -n litmus --create-namespace
```

The Litmus operator + ChaosCenter (web UI) deploy.

## Step 2 - Pick a ChaosExperiment from the Hub

Per [litmus-home][lh], the **ChaosHub** is "a repository hosting
most of the chaos experiments that are needed for a quick start in
Chaos Engineering." Common experiments:

| ChaosExperiment        | Effect                                |
|------------------------|---------------------------------------|
| `pod-delete`            | Kill random pods                       |
| `pod-network-latency`   | Inject network latency on the pod      |
| `pod-network-loss`      | Drop a percentage of packets           |
| `pod-cpu-hog`           | Spike CPU on the pod                   |
| `pod-memory-hog`        | Spike memory on the pod                |
| `node-cpu-hog`          | Spike CPU on the node                  |
| `node-drain`            | Drain a node                           |
| `disk-fill`             | Fill the pod's writable disk           |
| `kubelet-service-kill`  | Kill kubelet on a node                 |

Install per-experiment:

```bash
kubectl apply -f https://hub.litmuschaos.io/api/chaos/2.14.0?file=charts/generic/pod-delete/experiment.yaml
```

## Step 3 - Author a ChaosEngine

The ChaosEngine CR runs an experiment against a target:

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: checkout-pod-delete
  namespace: app
spec:
  appinfo:
    appns: app
    applabel: 'app=checkout'
    appkind: deployment
  chaosServiceAccount: pod-delete-sa
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '60'      # seconds
            - name: CHAOS_INTERVAL
              value: '20'       # seconds
            - name: PODS_AFFECTED_PERCENTAGE
              value: '50'
        probe:
          - name: 'check-checkout-availability'
            type: httpProbe
            httpProbe/inputs:
              url: 'http://checkout.app.svc:8080/health'
              insecureSkipVerify: false
              method:
                get:
                  criteria: '=='
                  responseCode: '200'
            mode: 'Continuous'
            runProperties:
              probeTimeout: 5
              interval: 2
              retry: 3
              probePollingInterval: 1
```

Per [litmus-home][lh], probes "create complete chaos scenarios
close to the real application experience upon failure." The probe
is the steady-state check per the chaos principles.

## Step 4 - Run

```bash
kubectl apply -f checkout-pod-delete.yaml
```

Litmus runs the experiment for `TOTAL_CHAOS_DURATION` seconds,
checking the probe continuously. The verdict (Pass / Fail) lands
in `chaosengine.status.experimentStatus.verdict`.

## Step 5 - Read the verdict

```bash
kubectl get chaosengine checkout-pod-delete -o jsonpath='{.status.experimentStatus.verdict}'
# Output: Pass | Fail
```

## Step 6 - Probe types

| Probe type   | Use                                            |
|--------------|------------------------------------------------|
| `httpProbe`   | HTTP endpoint health + status code              |
| `cmdProbe`    | Run a shell command; check exit code            |
| `k8sProbe`    | Check Kubernetes resource state                 |
| `promProbe`   | Query Prometheus metric; assert threshold       |

Probes can run in different modes: `SOT` (start of test), `EOT`
(end of test), `Edge` (both), `Continuous` (every N seconds during
the experiment).

## Step 7 - Observability

Per [litmus-home][lh]: "chaos observability by exporting Prometheus
metrics that highlight and quantify the impact of chaos on the
applications or infrastructure in real time."

Key metrics:

- `litmuschaos_passed_experiments`
- `litmuschaos_failed_experiments`
- `litmuschaos_awaited_experiments`

Wire to Grafana for dashboards.

## Step 8 - CI integration

```yaml
- name: Run chaos experiment
  run: |
    kubectl apply -f experiments/checkout-pod-delete.yaml
    kubectl wait --for=condition=Complete chaosengine/checkout-pod-delete --timeout=10m
    VERDICT=$(kubectl get chaosengine checkout-pod-delete -o jsonpath='{.status.experimentStatus.verdict}')
    echo "Verdict: $VERDICT"
    [ "$VERDICT" = "Pass" ]
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Running ChaosEngine without probe                                      | No steady-state check; verdict meaningless.                              | Always include `httpProbe` / `promProbe` (Step 3). |
| `PODS_AFFECTED_PERCENTAGE: 100`                                        | Kills all pods; service down.                                            | Start at 25-50%; increase per blast-radius principle. |
| Running in default namespace                                           | Could affect cluster components.                                          | Dedicated `app` namespace target. |
| One-shot experiment; never re-run                                      | Per chaos principle 4: automate continuously.                            | Schedule via CronJob (Step 8 in cron form). |
| Skipping `chaosServiceAccount`                                         | RBAC blocks experiment execution.                                        | Define ServiceAccount with appropriate permissions. |

## Limitations

- **Kubernetes only.** No native non-K8s support (vs Gremlin's
  multi-platform).
- **ChaosHub experiments need vetting.** Community experiments
  vary in quality.
- **Cluster overhead.** Litmus operator + per-experiment pods
  consume resources.
- **Per-tool incompatibility.** Litmus ChaosEngines aren't
  Chaos-Mesh CRDs; experiments don't port.

## References

- [lh][lh] - LitmusChaos overview, CNCF-hosted, ChaosExperiments
  + ChaosEngine + ChaosHub + probes, Prometheus metrics export.
- `chaos-mesh` - sibling K8s-native
  alternative.
- `gremlin-chaos` - commercial
  multi-platform alternative.
- `chaos-experiment-author` - methodology this tool implements.
