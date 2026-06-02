# qa-ci-integration

CI/CD test workflow patterns per platform: GitHub Actions, GitLab CI/CD, Jenkins, CircleCI. Each platform's matrix builds, artifact handling, retry policies, sharding, JUnit reporting. Plus cross-CI conventions reference (when to shard, retry policy, flake quarantine integration, artifact lifecycle).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [github-actions-test-jobs](skills/github-actions-test-jobs/SKILL.md) | S1 | Configures GitHub Actions test workflows - `.github/workflows/test.yml` with matrix builds (OS × runtime), JUnit XML artifact upload, retry/sharding, services (PostgreSQL, Redis), per-trigger filtering (pull_request, push, schedule, workflow_dispatch). Use when the project hosts on GitHub and the team wants idiomatic GitHub Actions patterns for test workflows. |
| Skill | [gitlab-ci-test-jobs](skills/gitlab-ci-test-jobs/SKILL.md) | S1 | Configures GitLab CI/CD test stages - `.gitlab-ci.yml` with parallel matrix, artifact reports (junit, coverage), services (postgres, redis), needs / dependencies between jobs, only/except + rules for trigger filtering, retry policy. Use when the project hosts on GitLab and the team wants idiomatic GitLab CI patterns. |
| Skill | [jenkinsfile-test-stages](skills/jenkinsfile-test-stages/SKILL.md) | S1 | Configures Jenkins declarative pipeline test stages - `Jenkinsfile` with stages, parallel + per-agent execution, post-actions (always / failure / success), pipeline-junit-plugin for test reports, lockable resources for shared infra. Use for Jenkins-based CI (common in enterprise / regulated environments). |
| Skill | [circleci-test-configs](skills/circleci-test-configs/SKILL.md) | S1 | Configures CircleCI test workflows - `.circleci/config.yml` with workflows, jobs, executors, parallelism (test splitting), orbs (reusable shared config), insights for analytics, contexts for per-team secrets. Use for CircleCI-hosted CI when the team values its parallelism + insights features. |
| Skill | [ci-test-job-conventions](skills/ci-test-job-conventions/SKILL.md) | S2 | Pure-reference for cross-CI test workflow conventions - when to shard (and how many shards), retry policy (which failures are safe to retry), flake quarantine integration, artifact lifecycle (retention / structure), per-trigger filtering (per-PR vs per-merge vs nightly), concurrency control patterns, JUnit reporting standards. Use as the team's reference doc for CI test workflow design across GitHub Actions / GitLab CI / Jenkins / CircleCI. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ci-integration@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
