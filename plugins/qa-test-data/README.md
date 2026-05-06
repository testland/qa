# qa-test-data

Test data engineering: Faker / FactoryBot / mimesis / Bogus generators; WireMock / MSW / Mountebank mock servers; synthetic-data-toolkit dispatcher; golden-file conventions + manager; seed-data curator; parameterized / boundary / negative test case generators; synthetic PII; malicious payload bank.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [faker-data](skills/faker-data/SKILL.md) | S1 | Faker (Python `faker` / JS `@faker-js/faker` / Ruby `faker-ruby`) — fields, locales, deterministic seeding. |
| skill | [factory-bot-data](skills/factory-bot-data/SKILL.md) | S1 | Ruby FactoryBot factories with traits, associations, sequences; build / create / build_stubbed strategies; pairs with Faker. |
| skill | [mimesis-data](skills/mimesis-data/SKILL.md) | S1 | Python mimesis (fastest pure-Python generator); 46 locales; Schema/Field typed-dict pattern. |
| skill | [bogus-data](skills/bogus-data/SKILL.md) | S1 | .NET Bogus typed `Faker<T>` builders with `.RuleFor` / `.StrictMode` / `.UseSeed`; `Generate*` for single / lazy / batch. |
| skill | [wiremock-stubs](skills/wiremock-stubs/SKILL.md) | S1 | JVM HTTP mock server: `stubFor` matchers + `willReturn` + `verify()` + dynamic ports + scenarios. |
| skill | [msw-handlers](skills/msw-handlers/SKILL.md) | S1 | JS / TS HTTP mocking via Mock Service Worker: `http.get` / `HttpResponse.json` handlers; browser + Node setup. |
| skill | [mountebank-imposters](skills/mountebank-imposters/SKILL.md) | S1 | Multi-protocol mocking (HTTP, TCP, SMTP, gRPC, more) via `POST /imposters`; predicates + responses; record-playback. |
| skill | [synthetic-data-toolkit](skills/synthetic-data-toolkit/SKILL.md) | S4 | Dispatcher across Faker / FactoryBot / mimesis / Bogus by language and use case; side-by-side patterns. |
| skill | [golden-file-conventions](skills/golden-file-conventions/SKILL.md) | S2 | Reference: snapshot/golden file naming, layout, sanitization, severity tiering, update-vs-fix decision tree. |
| skill | [seed-data-curator](skills/seed-data-curator/SKILL.md) | S3 | Build a reproducible E2E seed dataset; coverage matrix; persistence formats; intentional refresh cadence. |
| skill | [parameterized-test-generator](skills/parameterized-test-generator/SKILL.md) | S3 | All-pairs / pairwise combinatorial generation from a multi-input spec; constraints; coverage report. |
| skill | [boundary-value-generator](skills/boundary-value-generator/SKILL.md) | S3 | Six-point boundary cases per typed input field (numeric / string-length / collection-count / enum / nullable). |
| skill | [e2e-test-narrative-builder](skills/e2e-test-narrative-builder/SKILL.md) | S3 | Assemble multi-step E2E tests from intent lists; per-framework code emission. |
| skill | [synthetic-pii-generator](skills/synthetic-pii-generator/SKILL.md) | S3 | Realistic-but-fake PII using safe-by-construction values (RFC 2606 domains, IRS test SSN range, Stripe test cards). |
| skill | [malicious-payload-bank](skills/malicious-payload-bank/SKILL.md) | S2 | Reference catalog of adversarial payloads (SQLi / XSS / SSRF / path traversal / XXE / prototype pollution / ReDoS / Unicode / CRLF). |
| skill | [negative-test-generator](skills/negative-test-generator/SKILL.md) | S3 | Generate rejection-path tests mirroring happy-path: schema / auth / authz / rate / conflict / adversarial / server-error categories. |
| agent | [golden-file-manager](agents/golden-file-manager.md) | A2 | Active maintenance: add / update / prune snapshot baselines; refuse updates whose diff doesn't match PR intent. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
