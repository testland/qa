---
description: Short prompt that should load gitlab-ci-test-jobs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Make GitLab show test results in the merge request for this job.

```yaml
test:
  image: python:3.12
  script:
    - pip install -r requirements.txt
    - pytest
```
