---
name: seed-data-curator
description: "Builds a reproducible E2E seed dataset for the project's test environments - picks a representative user / org / data-product cross-section, generates the rows via the project's chosen factory library (FactoryBot / mimesis / Bogus / Faker + factory_boy), persists the dataset as a checked-in fixture (SQL dump / JSON / per-engine seed file), and wires it into the test bootstrap. Use when starting E2E coverage on a project that has no seed strategy, or when an existing seed has drifted."
---

# seed-data-curator

## Overview

E2E tests need **repeatable starting state** - the same set of
users, orgs, products, etc. before every run. Generating fresh data
per run produces flake; pulling from production raises PII /
security concerns; hand-crafted SQL fixtures rot. This skill
defines a workflow for building a **curated seed set** that:

1. Lives in the repo as a checked-in artifact.
2. Is regenerable on demand from the factory definitions.
3. Provides representative coverage of business-relevant states
   (roles, tiers, status variants).
4. Refreshes intentionally (PR-reviewed) rather than continuously.

## When to use

- A project is starting E2E coverage and has no seed strategy.
- An existing `seed.sql` has accumulated cruft over years and
  reviewers can't tell what each row represents.
- The team migrated from one factory library to another and the
  seed set should be regenerated to match.
- A new role / tier / feature flag needs to be exercised by E2E
  tests; the seed needs an example user.

## Step 1 - Define the coverage matrix

Enumerate the business-relevant states the seed must cover:

| Category    | Variants                                                    | Why                                          |
|-------------|-------------------------------------------------------------|----------------------------------------------|
| User role   | Admin / Manager / Standard / Read-only                       | Different UI / permissions per role.         |
| Account tier | Free / Starter / Pro / Enterprise                            | Feature flags / quota differ.                |
| Account state | Active / Suspended / Trial-expired / Deleted                 | Test the lifecycle handlers.                 |
| Locale      | en-US / ja-JP / de-DE / ar-SA                                | i18n / RTL coverage.                          |
| Data volume | Empty / 1 item / 10 items / 100 items                         | Pagination, empty-states, truncation.        |
| Time        | New (created today) / Old (created 1y ago) / Anniversary     | Date-relative business logic.                |

Pick the **minimum cross-product** that covers your test surface - 
not every combination. A typical sweet spot is 12-20 seed users.

## Step 2 - Pick the persistence format

| Format           | When to use                                                                  |
|------------------|------------------------------------------------------------------------------|
| **SQL dump** (`seeds/seed.sql`) | Fastest restore for E2E suites; database-specific.            |
| **JSON / YAML fixtures** (`seeds/users.json`) | Database-agnostic; consumed by the factory library at boot. |
| **Factory script** (`scripts/seed.rb` / `seed.py`) | Most flexible; runs the factories at boot time. |
| **Per-engine seed file** (`seeds/snowflake.sql` + `seeds/postgres.sql`) | Multi-warehouse projects. |

Default: **factory script** - runs the team's factory library to
build the dataset every time the test environment starts. SQL
dumps are faster but harder to review; reserve them for very large
seed sets.

## Step 3 - Author the factory script

Example with FactoryBot (Ruby):

```ruby
# scripts/seed.rb
require 'factory_bot'
require_relative '../db/factories/all'

# Deterministic seed for reproducibility
Faker::Config.random = Random.new(42)

# Coverage cross-section
roles  = %i[admin manager standard read_only]
tiers  = %i[free starter pro enterprise]
states = %i[active suspended]

users = []
roles.each_with_index do |role, ri|
  tiers.each_with_index do |tier, ti|
    user = FactoryBot.create(
      :user,
      role: role,
      tier: tier,
      state: ri == 0 && ti == 0 ? :suspended : :active,   # one suspended for coverage
      email: "#{role}-#{tier}@example.com",                # predictable for E2E tests to reference
      created_at: ri.zero? ? 1.year.ago : Time.current,
    )
    users << user
  end
end

puts "Seeded #{users.count} users"
```

The **predictable email** is intentional - E2E tests reference
`admin-pro@example.com` rather than guessing a Faker-generated
email. The factory still uses Faker for non-identifying fields
(name, address, phone).

For Python equivalent with factory_boy + mimesis, see the
[`mimesis-data`](../mimesis-data/SKILL.md) examples; the same
deterministic-seed-plus-predictable-email pattern applies.

## Step 4 - Wire into test bootstrap

### Local development

```bash
# Reset DB, run migrations, run seed
bundle exec rake db:test:reset
bundle exec ruby scripts/seed.rb
```

Expose this as a single command (`make seed`, `npm run seed`,
`yarn seed`) so contributors don't memorize the chain.

### CI

```yaml
# .github/workflows/e2e.yml (excerpt)
- name: Set up DB
  run: |
    bundle exec rake db:test:reset
    bundle exec ruby scripts/seed.rb

- name: Run E2E tests
  run: bundle exec rspec spec/system
```

Reset between test suites - never share state across suites unless
the team explicitly designed for it (and accepted the flake risk;
see [`flake-pattern-reference`](../../../qa-flake-triage/skills/flake-pattern-reference/SKILL.md)
Pattern 2).

### Ephemeral env (Docker Compose)

```yaml
# docker-compose.test.yml (excerpt)
services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
    command: |
      sh -c "
        rake db:migrate &&
        ruby scripts/seed.rb &&
        bundle exec rspec
      "
```

## Step 5 - Refresh intentionally

The seed dataset is a **maintained artifact**, not a one-shot. Refresh
when:

- A new role / tier / feature flag is introduced that needs E2E
  coverage.
- A factory definition changes shape (new required column, type
  change).
- An NFR review surfaces a missing-coverage gap (e.g. "we never
  test the suspended-account path").

Refresh process:

1. Update the factory script.
2. Run locally; verify the seed produces a sensible output.
3. Commit the **factory script change**, not a re-generated
   `seed.sql`. Reviewers can re-run from the script if needed.
4. Update CI's seed command if the script's interface changed.

## Output format

When this skill runs (e.g. via the agent / orchestrator chain), it
emits:

```markdown
## Seed dataset for `<project>`

**Persistence format:** factory script | SQL dump | JSON fixtures
**Total rows:** N (across M tables)
**Coverage matrix:**

| Category | Variants | Count |
|---|---|---:|
| Role | admin / manager / standard / read_only | 4 |
| Tier | free / starter / pro / enterprise | 4 |
| State | active / suspended | 2 |
| **Cross-product covered** | role × tier (16 cells) | 16 users |

**Files added/modified:**
  - scripts/seed.rb (new / modified)
  - db/factories/users.rb (extended for new role variant)

**Re-run command:** `bundle exec ruby scripts/seed.rb`

**Re-generation cadence:** on-demand only; no CI auto-refresh.

### Validation

- Local seed run: success (N users created).
- E2E suite passing against the seed: confirmed.
- No PII in seed (all emails `*@example.com`, all names Faker-generated).
```

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Production data dump as the seed                             | PII; legal / compliance risk; data drifts.                         | Always generated; never copied from prod. |
| Random fresh data per run                                   | Non-reproducible failures; "it passed last time" debugging.        | Deterministic seed (`Random.new(42)`); predictable identifiers. |
| 10k-row seed for unit tests                                  | Test setup time dominates; suite slows linearly.                   | Seed set is for E2E only; unit tests use per-test factories. |
| Editing `seed.sql` by hand                                   | Bypasses the factory; drift creates inconsistent state.            | Never hand-edit; always re-run the factory script. |
| Seed grows unboundedly                                       | Old role variants no longer used; unclear which rows the tests need. | Annual review; remove rows whose tests have been deleted. |
| One mega-seed for all environments                          | Different envs need different scale; one monolithic file is wrong for all. | Tier the seed: `seed:minimal`, `seed:standard`, `seed:perf` (each loads a different superset). |

## Limitations

- **Not for performance testing.** Perf tests need different
  volume profiles; use a separate seed (`seed:perf` with 100k rows)
  rather than reusing the E2E seed.
- **Locale coverage adds rows fast.** 4 roles × 4 tiers × 4
  locales = 64 users; review whether all 64 are needed.
- **Seed-vs-migration ordering.** If the seed depends on
  migrations, the migration order must be deterministic; otherwise
  a seed run on a fresh DB can hit "column not found" errors.

## References

- All four factory libraries:
  [`faker-data`](../faker-data/SKILL.md),
  [`factory-bot-data`](../factory-bot-data/SKILL.md),
  [`mimesis-data`](../mimesis-data/SKILL.md),
  [`bogus-data`](../bogus-data/SKILL.md).
- [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) - for PII fields in the seed; ensures the seed never carries
  real-looking PII.
- [`golden-file-conventions`](../golden-file-conventions/SKILL.md) - sibling reference for snapshot fixtures (similar
  long-lived-fixture concerns).
