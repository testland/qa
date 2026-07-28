# Gatling CI integration

A GitHub Actions workflow that runs the Gatling Maven build on pull requests
that touch simulation files and on a nightly schedule. A failed
`setUp().assertions(...)` exits the Maven build non-zero and fails the job; the
HTML report is uploaded regardless via `if: always()`.

```yaml
# .github/workflows/gatling.yml
name: load-test

on:
  pull_request:
    paths: ['src/test/java/**/*Simulation.java']
  schedule:
    - cron: '0 4 * * *'

jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Run Gatling
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: mvn -B gatling:test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gatling-report
          path: target/gatling/
          retention-days: 14
```

For Gradle, swap the run step for `./gradlew gatlingRun`; for sbt, `sbt 'Gatling/test'`.
