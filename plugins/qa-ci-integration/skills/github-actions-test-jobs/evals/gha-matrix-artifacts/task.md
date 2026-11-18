# Matrix legs vanish and reports go missing in our test workflow

## Problem Description

Fix `.github/workflows/test.yml` for the problems in `docs/ci-problems.md`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .github/workflows/test.yml ===============
name: test
on: [pull_request]
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci
      - run: npm test -- --reporter=junit --outputFile=reports/junit.xml
      - uses: actions/upload-artifact@v4
        if: success()
        with:
          name: junit-results
          path: reports/

=============== FILE: docs/ci-problems.md ===============
1. When one combination fails, the other combinations are cancelled, so we never see the full picture.
2. Failed runs have no test report to download.
3. The upload step fails with a conflict error saying an artifact with this name already exists.
4. Last week a hung test kept a Windows runner busy for six hours.
