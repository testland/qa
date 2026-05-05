# qa-chaos-resilience

Chaos engineering + fault injection per the Principles of Chaos Engineering. Litmus / Chaos Mesh (Kubernetes-native), Gremlin (commercial multi-platform), Toxiproxy (TCP-level), structured chaos experiment authoring, and combined HTTP+TCP fault injection scenarios.

## Components

| Type | Name | Archetype |
|---|---|---|
| skill | [chaos-experiment-author](skills/chaos-experiment-author/SKILL.md) | S3 |
| skill | [litmus-chaos](skills/litmus-chaos/SKILL.md) | S1 |
| skill | [chaos-mesh](skills/chaos-mesh/SKILL.md) | S1 |
| skill | [gremlin-chaos](skills/gremlin-chaos/SKILL.md) | S1 |
| skill | [toxiproxy-chaos](skills/toxiproxy-chaos/SKILL.md) | S1 |
| skill | [failure-injection-test-author](skills/failure-injection-test-author/SKILL.md) | S3 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-chaos-resilience@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
