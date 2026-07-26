# Jenkins - parallel and matrix stages

Deeper recipes split out of `jenkinsfile-test-stages` SKILL.md:
running stages concurrently, and fanning a stage across an
OS × runtime matrix.

## Parallel stages

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

## Matrix builds (Jenkins 2.302+)

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
