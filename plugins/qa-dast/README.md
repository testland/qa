# qa-dast

DAST (dynamic application security testing). Two per-tool skill
wrappers - OWASP ZAP (`zap-baseline`, carrying authenticated-scan
setup and layered scan-cadence planning as references) and nuclei
(`nuclei-dast`) - plus an adversarial unifier agent
(`dast-finding-triager`).

Sister to [`qa-sast`](../qa-sast/) - covers runtime vulnerabilities
(auth, session, input handling at runtime) that SAST can't see by
reading source code. Every scanner skill includes a
`## False-positive triage` section.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [zap-baseline](skills/zap-baseline/SKILL.md) | OWASP ZAP baseline (passive, PR-blocking-safe) + zap-full-scan companion (active, staging-only); rule customization TSV; authenticated-scan setup (context, auth methods, session management, OAuth/CSRF) and layered scan cadence (PR baseline → nightly active, baseline-finding ratchet) as references |
| Agent | [dast-finding-triager](agents/dast-finding-triager.md) | Adversarial unifier of scanner output; deduplicates by `(URL, method, parameter, finding-class)`; waiver enforcement; refuses pass with unwaived critical findings |
| Skill | [nuclei-dast](skills/nuclei-dast/SKILL.md) | Nuclei template-based HTTP scanning; JSONL output feeds dast-finding-triager. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-dast@testland-qa
```
