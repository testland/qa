# qa-chaos-resilience

Chaos engineering + fault injection per the Principles of Chaos Engineering. Litmus / Chaos Mesh (Kubernetes-native), Gremlin (commercial multi-platform), Toxiproxy (TCP-level), structured chaos experiment authoring, and combined HTTP+TCP fault injection scenarios.

## Components

| Type | Name | Archetype |
|---|---|---|
| Skill | [chaos-experiment-author](skills/chaos-experiment-author/SKILL.md) | S3 |
| Skill | [litmus-chaos](skills/litmus-chaos/SKILL.md) | S1 |
| Skill | [chaos-mesh](skills/chaos-mesh/SKILL.md) | S1 |
| Skill | [gremlin-chaos](skills/gremlin-chaos/SKILL.md) | S1 |
| Skill | [toxiproxy-chaos](skills/toxiproxy-chaos/SKILL.md) | S1 |
| Skill | [failure-injection-test-author](skills/failure-injection-test-author/SKILL.md) | S3 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-chaos-resilience@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
