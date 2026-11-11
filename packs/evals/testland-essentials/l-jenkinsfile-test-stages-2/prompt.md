---
description: Short prompt that should load jenkinsfile-test-stages with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Publish JUnit results even when tests fail in this Jenkinsfile.

```groovy
pipeline {
  agent any
  stages {
    stage('Test') { steps { sh 'mvn test' } }
  }
}
```
