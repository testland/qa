# qa-test-data

Test data engineering: Faker / FactoryBot / mimesis / Bogus generators; WireMock / MSW / Mountebank mock servers; synthetic-data-toolkit dispatcher; golden-file conventions + manager; seed-data curator; parameterized / boundary / negative test case generators; synthetic PII; malicious payload bank.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [faker-data](skills/faker-data/SKILL.md) | S1 | Faker (Python `faker` / JS `@faker-js/faker` / Ruby `faker-ruby`) — fields, locales, deterministic seeding. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
