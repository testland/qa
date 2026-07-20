# qa-test-data

Test data engineering: Faker / FactoryBot / mimesis / Bogus generators; WireMock / MSW / Mountebank mock servers; synthetic-data-tool-selector dispatcher; golden-file conventions + manager; seed-data curator; parameterized / boundary / negative test case generators; synthetic PII; malicious payload bank.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [faker-data](skills/faker-data/SKILL.md) | Faker (Python `faker` / JS `@faker-js/faker` / Ruby `faker-ruby`) - fields, locales, deterministic seeding. |
| Skill | [factory-bot-data](skills/factory-bot-data/SKILL.md) | Ruby FactoryBot factories with traits, associations, sequences; build / create / build_stubbed strategies; pairs with Faker. |
| Skill | [mimesis-data](skills/mimesis-data/SKILL.md) | Python mimesis (fastest pure-Python generator); 46 locales; Schema/Field typed-dict pattern. |
| Skill | [bogus-data](skills/bogus-data/SKILL.md) | .NET Bogus typed `Faker<T>` builders with `.RuleFor` / `.StrictMode` / `.UseSeed`; `Generate*` for single / lazy / batch. |
| Skill | [wiremock-stubs](skills/wiremock-stubs/SKILL.md) | JVM HTTP mock server: `stubFor` matchers + `willReturn` + `verify()` + dynamic ports + scenarios. |
| Skill | [msw-handlers](skills/msw-handlers/SKILL.md) | JS / TS HTTP mocking via Mock Service Worker: `http.get` / `HttpResponse.json` handlers; browser + Node setup. |
| Skill | [mountebank-imposters](skills/mountebank-imposters/SKILL.md) | Multi-protocol mocking (HTTP, TCP, SMTP, gRPC, more) via `POST /imposters`; predicates + responses; record-playback. |
| Skill | [synthetic-data-tool-selector](skills/synthetic-data-tool-selector/SKILL.md) | Dispatcher across Faker / FactoryBot / mimesis / Bogus by language and use case; side-by-side patterns. |
| Skill | [golden-file-conventions](skills/golden-file-conventions/SKILL.md) | Reference: snapshot/golden file naming, layout, sanitization, severity tiering, update-vs-fix decision tree. |
| Skill | [seed-data-curator](skills/seed-data-curator/SKILL.md) | Build a reproducible E2E seed dataset; coverage matrix; persistence formats; intentional refresh cadence. |
| Skill | [pairwise-test-case-generator](skills/pairwise-test-case-generator/SKILL.md) | All-pairs / pairwise combinatorial generation from a multi-input spec; constraints; coverage report. |
| Skill | [boundary-value-generator](skills/boundary-value-generator/SKILL.md) | Six-point boundary cases per typed input field (numeric / string-length / collection-count / enum / nullable). |
| Skill | [e2e-test-narrative-builder](skills/e2e-test-narrative-builder/SKILL.md) | Assemble multi-step E2E tests from intent lists; per-framework code emission. |
| Skill | [synthetic-pii-generator](skills/synthetic-pii-generator/SKILL.md) | Realistic-but-fake PII using safe-by-construction values (RFC 2606 domains, IRS test SSN range, Stripe test cards). |
| Skill | [malicious-payload-bank](skills/malicious-payload-bank/SKILL.md) | Reference catalog of adversarial payloads (SQLi / XSS / SSRF / path traversal / XXE / prototype pollution / ReDoS / Unicode / CRLF). |
| Skill | [test-data-patterns](skills/test-data-patterns/SKILL.md) | Architecture-tier reference: Test Data Builder (Pryce), Factory (with traits), Object Mother (Fowler), Fixture composition (Meszaros four-phase + Fresh-vs-Shared), Snapshot (defers to `golden-file-conventions`), Production-Data Anonymisation. |
| Skill | [negative-test-generator](skills/negative-test-generator/SKILL.md) | Generate rejection-path tests mirroring happy-path: schema / auth / authz / rate / conflict / adversarial / server-error categories. |
| Agent | [golden-file-manager](agents/golden-file-manager.md) | Active maintenance: add / update / prune snapshot baselines; refuse updates whose diff doesn't match PR intent. |
| Agent | [test-data-setup-agent](agents/test-data-setup-agent.md) | Stands up a full test-data setup for a feature: fixtures + seed data, composing the plugin's generators. |
| Agent | [mock-server-composer](agents/mock-server-composer.md) | Detects the stack and generates the matching mock-server config (WireMock / MSW / Mountebank). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data@testland-qa
```
