# Chaos Toolkit steady-state-hypothesis block and tolerance forms

Reference for the steady-state hypothesis validation section of
`chaos-experiment-author`. The five pre-flight checks there validate a
hypothesis expressed in this schema; this file is the schema and tolerance
detail they assume.

## The steady-state-hypothesis object

Per [chaostoolkit.org/reference/api/experiment/][ctk], the
`steady-state-hypothesis` object requires:

- `title` (string): human-readable rationale for the hypothesis.
- `probes` (array): one or more probe objects, each with:
  - `type`: `"probe"`
  - `name`: identifier string
  - `provider`: execution specification (HTTP, process, or Python)
  - `tolerance`: the gate value; if the probe's return value does not satisfy
    the tolerance, the experiment bails before running the method.

## Tolerance forms supported

Per [chaostoolkit.org/reference/api/experiment/][ctk]:

| Tolerance form | Syntax example | Evaluation |
|---|---|---|
| Scalar equality | `"tolerance": 200` | probe return == 200 |
| Boolean equality | `"tolerance": true` | probe return == true |
| String equality | `"tolerance": "OK"` | probe return == "OK" |
| Inclusive range | `"tolerance": [95, 100]` | 95 <= value <= 100 |
| Membership | `"tolerance": [200, 201, 204]` | value in list |
| Regex | `"tolerance": {"type": "regex", "pattern": "^healthy$"}` | regex match |
| JSONPath | `"tolerance": {"type": "jsonpath", "path": "$.status", "expect": "up"}` | JSONPath extract + compare |
| Range object | `"tolerance": {"type": "range", "range": [95.0, 100.0]}` | numeric bounds |

## Execution flow

Per [chaostoolkit.org/reference/concepts/][ctk-concepts]: probes run once before
the method (baseline check) and once after (deviation check). A probe that fails
before the method means the system is already outside its acceptable state; the
experiment must not run. A probe that fails after the method means the chaos
activity caused the system to leave its steady state.

[ctk]: https://chaostoolkit.org/reference/api/experiment/
[ctk-concepts]: https://chaostoolkit.org/reference/concepts/
