# Jenkins - environment, credentials, resource locks, and triggers

Deeper recipes split out of `jenkinsfile-test-stages` SKILL.md:
serializing shared infrastructure, injecting environment plus
masked credentials, and scheduling / multi-branch behavior.

## Lockable resources

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

## Environment + credentials

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

## Multi-branch + scheduled

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
