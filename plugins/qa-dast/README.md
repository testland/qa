# qa-dast

DAST (dynamic application security testing). Three per-tool skill
wrappers (OWASP ZAP, Burp Suite Pro/Enterprise, NightVision) plus
a build-an-X cadence skill (`dast-baseline-runner`) and an
adversarial unifier agent (`dast-finding-triager`).

**Second Phase 5 plugin per the v2 master plan.** Sister to
[`qa-sast`](../qa-sast/) — covers runtime vulnerabilities (auth,
session, input handling at runtime) that SAST can't see by reading
source code.

**Phase 5-specific amendment enforced:** every scanner skill
includes a `## False-positive triage` section.

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

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** + the **Phase 5
amendment requiring the False-positive triage section in every
scanner skill**. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
