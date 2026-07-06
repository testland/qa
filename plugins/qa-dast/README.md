# qa-dast

DAST (dynamic application security testing). Three per-tool skill
wrappers (OWASP ZAP, Burp Suite Pro/Enterprise, NightVision) plus
a build-an-X cadence skill (`dast-baseline-runner`) and an
adversarial unifier agent (`dast-finding-triager`).

Sister to [`qa-sast`](../qa-sast/) - covers runtime vulnerabilities
(auth, session, input handling at runtime) that SAST can't see by
reading source code. Every scanner skill includes a
`## False-positive triage` section.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [zap-baseline](skills/zap-baseline/SKILL.md) | OWASP ZAP baseline (passive, PR-blocking-safe) + zap-full-scan companion (active, staging-only); auth via context file; rule customization TSV |
| Skill | [burp-headless](skills/burp-headless/SKILL.md) | Burp Suite Pro REST API + Enterprise CI integration; BApp Store extensions; session-handling rules for auth |
| Skill | [nightvision-dast](skills/nightvision-dast/SKILL.md) | White-box-assisted DAST tracing findings to source; OpenAPI / Postman / GraphQL targets; Interactive Logins / Header / Cookie / TOTP auth |
| Skill | [dast-baseline-runner](skills/dast-baseline-runner/SKILL.md) | Build-an-X for layered DAST cadence: ZAP baseline (PR) → ZAP full + NightVision (nightly) → Burp deep (per-release); baseline-finding ratchet; coverage measurement |
| Agent | [dast-finding-triager](agents/dast-finding-triager.md) | Adversarial unifier across all 3 sister scanners; deduplicates by `(URL, method, parameter, finding-class)`; waiver enforcement; refuses pass with unwaived critical findings |
| Skill | [nuclei-dast](skills/nuclei-dast/SKILL.md) | Nuclei template-based HTTP scanning; JSONL output feeds dast-finding-triager. |
| Skill | [zap-authenticated-scans](skills/zap-authenticated-scans/SKILL.md) | Authenticated DAST setup: ZAP auth scripts, session management, OAuth/CSRF handling. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-dast@testland-qa
```
