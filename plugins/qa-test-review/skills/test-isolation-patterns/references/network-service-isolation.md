# Network and external-service isolation

Deep reference for `test-isolation-patterns` SKILL.md. Consult when a test touches a service the team does not control (third-party HTTP APIs, external endpoints). Tests should not depend on external services they don't control; three patterns cover the choice.

## Stub (canned response)

Use when the test doesn't care about the network itself. Reach for a stub library - [nock](https://github.com/nock/nock), [WireMock](https://wiremock.org/), [Mountebank](https://github.com/bbyars/mountebank) - or the `msw-handlers` / `wiremock-stubs` skills in qa-test-data (Mountebank lives in wiremock-stubs references/).

## Contract test

Use when the test cares whether the service contract holds. [Pact](https://docs.pact.io/) or [schemathesis](https://schemathesis.readthedocs.io/) verify the contract rather than a canned body.

## Real network call in a controlled environment

Use for a smoke / canary test in a staging tier with a dedicated test partition, where exercising the live service is the point of the test.

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Unit tests calling the real external API | Tests fail when the API is down; tests pass when the API silently changes |
| Stubs that drift from production response shape | Tests pass with stubs that don't match reality |
| One global stub for the whole suite | Tests cross-couple through the stub configuration |
| Contract test with no contract refresh | Stub goes stale; tests pass while production breaks |

See also the `msw-handlers` and `wiremock-stubs` skills in qa-test-data for stub implementation (multi-protocol Mountebank in wiremock-stubs references/), and the SKILL's pattern-selection guide for when each pattern applies.
