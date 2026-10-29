# Tradeoff matrices for other test layers

Deep reference for `framework-choice-advisor` Step 3. Score the Step 1
axes first; these tables only compare options inside one layer. Pick per
layer: the stack is several tools, not one.

## Mobile native

| Framework | Platform | Language | Notes |
|---|---|---|---|
| **Espresso** | Android native | Kotlin / Java | Google's first-party. In-process, fast, deterministic. |
| **XCUITest** | iOS native | Swift / Obj-C | Apple's first-party; UI tests drive the app from a separate test-runner process. |
| **Appium** | iOS + Android (and others) | All major | Cross-platform unifier; trades depth for breadth. WebDriver-based - same flake patterns as Selenium. |
| **Detox** | React Native | JS / TS | RN-specialist; grey-box testing. |

Decision: if the team is single-platform native (iOS only or Android only), use the first-party framework. Cross-platform → Appium, accept the WebDriver flake-tax. React-Native specifically → Detox.

## API / contract

| Framework | Scope | Language | Notes |
|---|---|---|---|
| **RestAssured** | REST API integration tests | Java / Kotlin | The JVM-default; mature, deeply integrated with JUnit / TestNG. |
| **Karate** | REST + SOAP + GraphQL + gRPC | Karate DSL (Cucumber-like) | DSL-first; lowers barrier for non-Java testers. |
| **schemathesis** | OpenAPI / GraphQL property-based fuzzing | Python | Generative; complements example-based tests. |
| **Pact** | Consumer-driven contract tests | JS / JVM / Python / Go / Ruby / .NET | Different category - contract, not integration. See `pact-contract-testing`. |
| **Postman / Newman** | Collection-driven API tests | Postman DSL | UI-driven authoring; not code-first. Often used by non-engineers. |

## Performance

| Framework | Scope | Language | Notes |
|---|---|---|---|
| **k6** | Load + perf, code-first | JS (with TS support) | Grafana's; lowest barrier for engineers, excellent CI integration. |
| **Locust** | Load + perf, code-first | Python | Open-source; user-class-based modelling. |
| **JMeter** | Load + perf, GUI-first | XML config | Mature, ecosystem-heavy; GUI-driven authoring is the trade-off. |
| **Gatling** | Load + perf, code-first | Scala / Java / Kotlin | High-throughput; JVM stack. |

## Sources

- Espresso: https://developer.android.com/training/testing/espresso
- XCUITest (XCTest UI testing): https://developer.apple.com/documentation/xctest/user_interface_tests
- Appium: https://appium.io/docs/en/latest/
- Detox: https://wix.github.io/Detox/
- REST Assured: https://rest-assured.io/
- Karate: https://github.com/karatelabs/karate
- Schemathesis: https://schemathesis.readthedocs.io/
- Pact: https://docs.pact.io/
- Newman: https://github.com/postmanlabs/newman
- k6: https://grafana.com/docs/k6/latest/
- Locust: https://docs.locust.io/
- Apache JMeter: https://jmeter.apache.org/
- Gatling: https://docs.gatling.io/
