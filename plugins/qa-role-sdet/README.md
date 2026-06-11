# SDET (role bundle)

SDET role bundle: one-command install of the full automation-engineer stack plus per-language unit testing (JS/TS, Python, JVM, .NET, Go/Rust), contract testing, mutation testing, code quality, test impact analysis, and load testing.

Unlike the tech-domain bundles (`qa-role-frontend`, `qa-role-backend`), this bundle is organized around the **job role**: an SDET builds and owns test infrastructure across layers — frameworks and harnesses, unit/integration depth in product languages, contract and mutation testing, performance scripting, and suite economics — on top of everything a test automation engineer does. If you only automate on top of an existing framework, `qa-role-automation-engineer` is the lighter install; work in a single language? Install just that language's unit-test plugin individually.

Installing this one plugin installs all 20 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-sdet@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

The automation-engineer stack:

- **qa-web-e2e** - Web E2E frameworks + cloud grids
- **qa-api-testing** - API test automation + fuzzing + chaos
- **qa-mobile** - Mobile automation
- **qa-bdd** - BDD frameworks + Gherkin authoring
- **qa-visual-regression** - Visual regression
- **qa-ci-integration** - CI test workflows + sharding/retry conventions
- **qa-flake-triage** - Flake triage, bisection, quarantine
- **qa-test-review** - Test-code quality reviewers + pattern catalogs
- **qa-test-data** - Test data generators, mock servers, fixtures
- **qa-compatibility** - Browser/OS/device matrix strategy

Plus the SDET depth:

- **qa-unit-tests-js** - JS/TS unit testing (Jest, Vitest, Mocha, AVA, Jasmine)
- **qa-unit-tests-python** - Python unit testing (pytest, unittest, doctest, nose2)
- **qa-unit-tests-jvm** - JVM unit testing (JUnit 5, Kotest, Spock, TestNG, ScalaTest)
- **qa-unit-tests-net** - .NET unit testing (xUnit, NUnit, MSTest)
- **qa-unit-tests-go-rust** - Go/Rust unit testing (go test, Ginkgo, cargo test, rstest)
- **qa-contract-testing** - Contract testing (Pact, OpenAPI/GraphQL/Protobuf diffing)
- **qa-mutation-testing** - Mutation testing (Stryker, PIT, mutmut, Mull)
- **qa-code-quality** - Production-code quality analysis (SonarQube, complexity, dead code)
- **qa-test-impact-analysis** - Change-based test selection + suite pruning
- **qa-load-testing** - Load/performance scripting (k6, JMeter, Gatling, Locust) + profiling

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
