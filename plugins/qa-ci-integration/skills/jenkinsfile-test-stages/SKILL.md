---
name: jenkinsfile-test-stages
description: "Configures Jenkins declarative pipeline test stages - `Jenkinsfile` with stages, parallel + per-agent execution, post-actions (always / failure / success), pipeline-junit-plugin for test reports, lockable resources for shared infra. Use for Jenkins-based CI (common in enterprise / regulated environments)."
---

# jenkinsfile-test-stages

## Overview

Jenkins Declarative Pipeline (introduced 2017) is the modern
Jenkinsfile syntax - replaces older Scripted Pipeline for most
use cases.

A Jenkinsfile defines:

- **Pipeline** - top-level container.
- **Agent** - where stages run (any agent / specific node /
  Docker container).
- **Stages** - sequential or parallel phases.
- **Steps** - commands within a stage.
- **Post** - actions after stages (always / success / failure /
  unstable / changed).

## When to use

- Enterprise / regulated environments using Jenkins.
- Existing Jenkins infrastructure; migration to GitHub
  Actions / GitLab CI prohibitive.
- Self-hosted CI / specialized hardware needs (GPU, specialized
  drivers).

For new projects in 2026+: GitHub Actions / GitLab CI offer
better managed-runner experiences. Jenkins shines in self-hosted
+ plugin-rich environments.

## How to use

1. Add a `Jenkinsfile` with a `pipeline { agent ...; stages { ... } }`
   block; choose `agent any`, a labelled node, or a Docker image
   for reproducibility (Steps 1-2).
2. Define `stage('Build')` / `stage('Test')` steps that run your
   install + test commands via `sh`.
3. Parallelize independent suites and fan across an OS × runtime
   matrix -
   [references/parallel-and-matrix.md](references/parallel-and-matrix.md).
4. Add a `post {}` block to publish JUnit XML, archive artifacts,
   and notify per outcome -
   [references/post-actions.md](references/post-actions.md).
5. Inject `environment {}` + masked `withCredentials`, serialize
   shared infra with `lock(...)`, and set `triggers` / `options` -
   [references/environment-and-triggers.md](references/environment-and-triggers.md).
6. Reach for `retry(2)` only on genuinely non-deterministic steps;
   prefer quarantine.
7. Review the anti-patterns table before committing.

## Step 1 - Basic Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }
}
```

`agent any` runs on any available executor; pin via `agent { label 'linux' }`
or `agent { docker { image 'node:22' } }`.

## Step 2 - Docker agent

```groovy
pipeline {
    agent {
        docker {
            image 'node:22'
            args '-v /tmp:/tmp'
        }
    }

    stages {
        stage('Test') {
            steps {
                sh 'npm ci && npm test'
            }
        }
    }
}
```

Docker agents provide reproducibility - same Node version on
every run.

## Advanced pipeline patterns

Deeper stage recipes are split into reference files:

- **Parallel and matrix stages** - run unit / integration / E2E
  concurrently and fan across OS × runtime:
  [references/parallel-and-matrix.md](references/parallel-and-matrix.md).
- **Post actions** - `post { always / success / failure / unstable }`
  for JUnit publishing, artifact archiving, and notifications:
  [references/post-actions.md](references/post-actions.md).
- **Environment, credentials, locks, and triggers** -
  `environment {}`, `withCredentials`, `lock(...)`, `triggers`,
  `options {}`:
  [references/environment-and-triggers.md](references/environment-and-triggers.md).

## When to retry

```groovy
stage('Test') {
    steps {
        retry(2) {
            sh 'npm test'
        }
    }
}
```

Use sparingly - retries hide flake. Prefer
`flaky-test-quarantine` (in the qa-flake-triage plugin).

## Worked example

A regulated team runs its suite on a self-hosted Jenkins with a
shared integration database.

1. The `Jenkinsfile` pins `agent { docker { image 'node:22' } }`
   so every run uses the same runtime.
2. A `Tests` stage runs `Unit` and `Integration` in `parallel`;
   the `E2E` branch overrides its agent to a
   `mcr.microsoft.com/playwright:v1.50.0-noble` image.
3. The `Integration` step wraps its work in
   `lock(resource: 'shared-test-database')` so only one build
   touches the DB at a time.
4. `withCredentials([...])` injects the registry token, masked in
   logs; `environment { CI = 'true' }` marks the run as CI.
5. `post { always { junit 'reports/junit/*.xml';
   archiveArtifacts 'coverage/**' } }` publishes results either
   way, and `failure { slackSend(...) }` pings `#ci` on a red build.
6. `options { timeout(time: 30, unit: 'MINUTES') }` kills hung
   builds so they don't hold executors.

Result: reproducible runs, no DB contention across parallel
builds, and test reports plus notifications on every outcome.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Scripted pipeline for new code                                         | Declarative is the standard; better tooling support.                      | Declarative Pipeline (Step 1). |
| Plaintext credentials in `Jenkinsfile`                                | Secret leak.                                                              | `withCredentials({...})` ([environment-and-triggers](references/environment-and-triggers.md)). |
| No `post { always {} }` for artifact upload                             | Failure investigation incomplete.                                         | Always upload ([post-actions](references/post-actions.md)). |
| Single-agent pipeline for parallel work                                | No parallelism; slow.                                                     | Parallel stages ([parallel-and-matrix](references/parallel-and-matrix.md)). |
| Missing `timeout`                                                      | Hung jobs consume executors indefinitely.                                | `options { timeout(...) }` ([environment-and-triggers](references/environment-and-triggers.md)). |
| Skipping `agent { docker {...}}`                                       | Inconsistent runtime per agent; hard to reproduce.                       | Docker agents (Step 2). |

## Limitations

- **Plugin-heavy ecosystem.** Updates can break things; pin
  versions.
- **Self-hosted infra cost.** Manage Jenkins controller + agents.
- **Slower modernization.** Jenkins evolves; modern features
  (matrix, declarative) require version bumps.
- **YAML / Groovy mix.** Jenkinsfile is Groovy DSL; some teams
  prefer YAML.

## References

- Jenkins Declarative Pipeline at `jenkins.io/doc/book/pipeline/`.
- [references/parallel-and-matrix.md](references/parallel-and-matrix.md),
  [references/post-actions.md](references/post-actions.md),
  [references/environment-and-triggers.md](references/environment-and-triggers.md) -
  deeper stage recipes.
- `github-actions-test-jobs`,
  `gitlab-ci-test-jobs` -
  alternatives; CircleCI patterns live in `ci-test-job-conventions`
  references/circleci.md.
- `junit-xml-analysis` - JUnit XML parser.
