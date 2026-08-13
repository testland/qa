# qa-test-data

Test data engineering: Faker as the default generator plus the synthetic-data-toolkit umbrella (FactoryBot / mimesis / Bogus); WireMock (with Mountebank multi-protocol reference) and MSW mock servers; golden-file conventions + manager; seed-data curator; parameterized / boundary / negative test case generators; synthetic PII; malicious payload bank.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [faker-data](skills/faker-data/SKILL.md) | Faker (Python `faker` / JS `@faker-js/faker` / Ruby `faker-ruby`) - fields, locales, deterministic seeding. The family default. |
| Skill | [synthetic-data-toolkit](skills/synthetic-data-toolkit/SKILL.md) | Umbrella for the generators beyond Faker: dispatch by language + job; side-by-side patterns; full FactoryBot (Ruby), mimesis (Python), and Bogus (.NET) workflows in references/. |
| Skill | [wiremock-stubs](skills/wiremock-stubs/SKILL.md) | JVM HTTP mock server: `stubFor` matchers + `willReturn` + `verify()` + dynamic ports + scenarios; Mountebank multi-protocol workflow in references/. |
| Skill | [msw-handlers](skills/msw-handlers/SKILL.md) | JS / TS HTTP mocking via Mock Service Worker: `http.get` / `HttpResponse.json` handlers; browser + Node setup. |
| Skill | [golden-file-conventions](skills/golden-file-conventions/SKILL.md) | Reference: snapshot/golden file naming, layout, sanitization, severity tiering, update-vs-fix decision tree. |
| Skill | [seed-data-curator](skills/seed-data-curator/SKILL.md) | Build a reproducible E2E seed dataset; coverage matrix; persistence formats; intentional refresh cadence. |
| Skill | [pairwise-test-case-generator](skills/pairwise-test-case-generator/SKILL.md) | All-pairs / pairwise combinatorial generation from a multi-input spec; constraints; coverage report. |
| Skill | [boundary-value-generator](skills/boundary-value-generator/SKILL.md) | Six-point boundary cases per typed input field (numeric / string-length / collection-count / enum / nullable). |
| Skill | [synthetic-pii-generator](skills/synthetic-pii-generator/SKILL.md) | Realistic-but-fake PII using safe-by-construction values (RFC 2606 domains, IRS test SSN range, Stripe test cards). |
| Skill | [malicious-payload-bank](skills/malicious-payload-bank/SKILL.md) | Reference catalog of adversarial payloads (SQLi / XSS / SSRF / path traversal / XXE / prototype pollution / ReDoS / Unicode / CRLF). |
| Skill | [test-data-patterns](skills/test-data-patterns/SKILL.md) | Architecture-tier reference: Test Data Builder (Pryce), Factory (with traits), Object Mother (Fowler), Fixture composition (Meszaros four-phase + Fresh-vs-Shared), Snapshot (defers to `golden-file-conventions`), Production-Data Anonymisation. |
| Skill | [negative-test-generator](skills/negative-test-generator/SKILL.md) | Generate rejection-path tests mirroring happy-path: schema / auth / authz / rate / conflict / adversarial / server-error categories. |
| Agent | [golden-file-manager](agents/golden-file-manager.md) | Active maintenance: add / update / prune snapshot baselines; refuse updates whose diff doesn't match PR intent. |
| Agent | [test-data-setup-agent](agents/test-data-setup-agent.md) | Stands up a full test-data setup for a feature: fixtures + seed data, composing the plugin's generators. |

## Choosing WireMock vs MSW vs Mountebank

| Project shape | Mock server |
| --- | --- |
| JVM (Java / Kotlin / Scala), HTTP dependencies | `wiremock-stubs` - in-process `@WireMockTest`, typed DSL |
| JS / TS (browser or Node), HTTP dependencies | `msw-handlers` - one handler set shared across Vitest / Jest / Cypress / Playwright |
| Any stack with non-HTTP dependencies (TCP, SMTP, LDAP, gRPC, WebSockets) | Mountebank - see `wiremock-stubs` references/mountebank.md |

Pick one per project; add Mountebank only when a dependency genuinely isn't HTTP.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data@testland-qa
```
