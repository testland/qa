# Jenkins - post actions

Deeper recipe split out of `jenkinsfile-test-stages` SKILL.md:
the `post {}` block that runs after stages - JUnit publishing,
artifact archiving, and outcome-specific notifications.

## Post actions

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
