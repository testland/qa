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

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [zap-baseline](skills/zap-baseline/SKILL.md) | S1 | OWASP ZAP baseline (passive, PR-blocking-safe) + zap-full-scan companion (active, staging-only); auth via context file; rule customization TSV |
| Skill | [burp-headless](skills/burp-headless/SKILL.md) | S1 | Burp Suite Pro REST API + Enterprise CI integration; BApp Store extensions; session-handling rules for auth |
| Skill | [nightvision-dast](skills/nightvision-dast/SKILL.md) | S1 | White-box-assisted DAST tracing findings to source; OpenAPI / Postman / GraphQL targets; Interactive Logins / Header / Cookie / TOTP auth |
| Skill | [dast-baseline-runner](skills/dast-baseline-runner/SKILL.md) | S3 | Build-an-X for layered DAST cadence: ZAP baseline (PR) → ZAP full + NightVision (nightly) → Burp deep (per-release); baseline-finding ratchet; coverage measurement |
| Agent | [dast-finding-triager](agents/dast-finding-triager.md) | A3 | Adversarial unifier across all 3 sister scanners; deduplicates by `(URL, method, parameter, finding-class)`; waiver enforcement; refuses pass with unwaived critical findings |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-dast@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
