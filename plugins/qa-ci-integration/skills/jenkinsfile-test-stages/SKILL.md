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

## Step 3 - Parallel stages

```groovy
pipeline {
    agent any

    stages {
        stage('Tests') {
            parallel {
                stage('Unit') {
                    steps { sh 'npm test' }
                }
                stage('Integration') {
                    steps { sh 'npm run test:integration' }
                }
                stage('E2E') {
                    agent {
                        docker { image 'mcr.microsoft.com/playwright:v1.50.0-noble' }
                    }
                    steps { sh 'npx playwright test' }
                }
            }
        }
    }
}
```

Parallel stages can have different agents - useful when E2E
needs a Playwright-equipped image.

## Step 4 - Matrix builds (Jenkins 2.302+)

```groovy
pipeline {
    agent none

    stages {
        stage('Test matrix') {
            matrix {
                axes {
                    axis {
                        name 'OS'
                        values 'linux', 'macos', 'windows'
                    }
                    axis {
                        name 'NODE_VERSION'
                        values '20', '22'
                    }
                }
                stages {
                    stage('Test') {
                        agent { label "${OS}" }
                        steps {
                            sh 'npm ci && npm test'
                        }
                    }
                }
            }
        }
    }
}
```

Matrix runs all OS × Node combinations in parallel.

## Step 5 - Post actions

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }

    post {
        always {
            // Always run - even on failure
            junit 'reports/junit/*.xml'
            archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
        success {
            slackSend(channel: '#ci', message: "✅ Build ${env.BUILD_NUMBER} passed")
        }
        failure {
            slackSend(channel: '#ci', message: "❌ Build ${env.BUILD_NUMBER} failed: ${env.BUILD_URL}")
        }
        unstable {
            // E.g., tests passed but with warnings
            mail to: 'team@example.com', subject: "Build ${env.BUILD_NUMBER} unstable"
        }
    }
}
```

`post { always {} }` runs on any outcome - essential for artifact
upload + notifications.

The `junit '...'` step (from JUnit Plugin) parses XML and renders
results in Jenkins UI.

## Step 6 - Lockable resources

```groovy
pipeline {
    agent any

    stages {
        stage('Integration') {
            steps {
                lock(resource: 'shared-test-database') {
                    sh 'npm run test:integration'
                }
            }
        }
    }
}
```

`lock(...)` uses the Lockable Resources Plugin to serialize
access to shared resources (test DB, license-locked tool, etc.).

## Step 7 - Environment + credentials

```groovy
pipeline {
    agent any

    environment {
        CI = 'true'
        NODE_ENV = 'test'
    }

    stages {
        stage('Test') {
            steps {
                withCredentials([string(credentialsId: 'npm-auth-token', variable: 'NODE_AUTH_TOKEN')]) {
                    sh 'npm ci && npm test'
                }
            }
        }
    }
}
```

`withCredentials([...])` masks secrets in build logs.

## Step 8 - Multi-branch + scheduled

```groovy
pipeline {
    agent any

    triggers {
        cron('0 4 * * *')   // daily at 4 AM
        pollSCM('*/15 * * * *')   // poll every 15 min (or use webhook)
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages { /* ... */ }
}
```

Per-branch behavior via Multibranch Pipeline job type (separate
config in Jenkins UI).

## Step 9 - When to retry

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

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Scripted pipeline for new code                                         | Declarative is the standard; better tooling support.                      | Declarative Pipeline (Step 1). |
| Plaintext credentials in `Jenkinsfile`                                | Secret leak.                                                              | `withCredentials({...})` (Step 7). |
| No `post { always {} }` for artifact upload                             | Failure investigation incomplete.                                         | Always upload (Step 5). |
| Single-agent pipeline for parallel work                                | No parallelism; slow.                                                     | Parallel stages (Step 3). |
| Missing `timeout`                                                      | Hung jobs consume executors indefinitely.                                | `options { timeout(...) }` (Step 8). |
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
- `github-actions-test-jobs`,
  `gitlab-ci-test-jobs`,
  `circleci-test-configs` - 
  alternatives.
- `junit-xml-analysis` - JUnit XML parser.
