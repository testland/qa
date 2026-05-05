# qa-ci-integration

CI/CD test workflow patterns per platform: GitHub Actions, GitLab CI/CD, Jenkins, CircleCI. Each platform's matrix builds, artifact handling, retry policies, sharding, JUnit reporting. Plus cross-CI conventions reference (when to shard, retry policy, flake quarantine integration, artifact lifecycle).

## Components

| Type | Name | Archetype |
|---|---|---|
| skill | [github-actions-test-jobs](skills/github-actions-test-jobs/SKILL.md) | S1 |
| skill | [gitlab-ci-test-jobs](skills/gitlab-ci-test-jobs/SKILL.md) | S1 |
| skill | [jenkinsfile-test-stages](skills/jenkinsfile-test-stages/SKILL.md) | S1 |
| skill | [circleci-test-configs](skills/circleci-test-configs/SKILL.md) | S1 |
| skill | [ci-test-job-conventions](skills/ci-test-job-conventions/SKILL.md) | S2 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ci-integration@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
