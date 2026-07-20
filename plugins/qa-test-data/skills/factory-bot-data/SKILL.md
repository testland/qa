---
name: factory-bot-data
description: "Authors Ruby FactoryBot factories with traits, associations, sequences, and the three build strategies (build / create / build_stubbed); integrates with RSpec / Minitest test suites; pairs with Faker for randomized field values. Use when the project is Ruby / Rails and needs structured fixture creation with referential integrity."
---

# factory-bot-data

## Overview

FactoryBot (formerly factory_girl) is the canonical Ruby fixture-
factory library - it builds object graphs with referential integrity
that raw [`faker-data`](../faker-data/SKILL.md) cannot
([factory_bot-readme][readme]).

[readme]: https://github.com/thoughtbot/factory_bot

The split:
- **Faker** generates field values (`Faker::Name.name`).
- **FactoryBot** orchestrates object creation (`create(:user, :admin,
  posts_count: 3)`) - including sequence-based unique IDs,
  associations between models, and trait composition.

## When to use

- The project is Ruby (Rails or pure Ruby).
- Tests need structured fixtures: a `User` with three `Posts` and a
  `Profile`, all linked correctly.
- The test suite uses RSpec or Minitest - both are first-class.
- The team wants "intent-revealing" fixture names (`create(:admin)`)
  rather than per-field overrides.

## Install

```bash
gem install factory_bot
```

For Rails projects, prefer the Rails-specific gem with
auto-loading:

```ruby
# Gemfile
group :test do
  gem 'factory_bot_rails'   # adds Rails-specific helpers and auto-loads spec/factories/
end
```

(Per [factory_bot-readme][readme].)

## Authoring

### Basic factory

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name  { "John Doe" }
    email { "john@example.com" }
  end
end
```

(Per [factory_bot-readme][readme].)

Each attribute is a block - the block is evaluated lazily at object
creation, so `Faker::Name.name` re-runs per `create` call.

### Sequences

For unique values across factory invocations:

```ruby
sequence :email do |n|
  "user#{n}@example.com"
end

factory :user do
  email   # uses the sequence
end
```

(Per [factory_bot-readme][readme].)

### Associations

```ruby
factory :post do
  title  { "Hello" }
  body   { "World" }
  user   # implicit reference to a user factory
end

# OR explicit association
factory :post do
  user   # short form
  # association :user, factory: :admin   # explicit form
end

# Has-many: build N posts from a user factory
factory :user do
  name { "John" }
  after(:create) do |user|
    create_list(:post, 3, user: user)
  end
end
```

### Traits

Traits compose mix-ins onto a base factory:

```ruby
factory :user do
  name  { "John Doe" }
  email { "john@example.com" }

  trait :admin do
    role  { "admin" }
  end

  trait :with_posts do
    after(:create) do |user|
      create_list(:post, 3, user: user)
    end
  end
end

# Apply one or more traits at create time
FactoryBot.create(:user, :admin, :with_posts)
```

(Per [factory_bot-readme][readme].)

Traits are the canonical way to keep factory bodies DRY - instead of
ten variant factories (`:admin_user`, `:premium_user`,
`:admin_premium_user`, …), one base factory plus N traits composes
to all variants.

## Build strategies

Per [factory_bot-readme][readme], FactoryBot supports three:

| Strategy        | What it does                                                | When to use                           |
|-----------------|-------------------------------------------------------------|---------------------------------------|
| `build(:x)`     | Returns an **unsaved** ActiveRecord object.                  | Pure-logic tests; no DB persistence needed. |
| `create(:x)`    | **Saves** the object (and any associations) to the database. | Integration tests that exercise persistence. |
| `build_stubbed(:x)` | Returns a **stubbed** object: appears persisted (`new_record?` returns false) but never hits the database. | Speed up unit tests that don't actually need DB IO. |

**Speed hierarchy:** `build_stubbed` >> `build` >> `create`. Use the
weakest one that still tests what you need.

```ruby
build(:user)          # Unsaved User instance
create(:user)         # Persisted User (and any associations)
build_stubbed(:user)  # Fake-persisted User; `id` is set, `new_record?` is false
```

## Integrating with Faker

Plug Faker into the factory body for randomized values:

```ruby
require 'faker'

FactoryBot.define do
  factory :user do
    name  { Faker::Name.name }
    email { Faker::Internet.unique.email }   # `.unique` enforces uniqueness across factory invocations
    age   { Faker::Number.between(from: 18, to: 80) }
  end
end
```

`Faker::Internet.unique` (and other `unique` helpers) tracks
generated values per session and raises if exhausted. Use this
instead of a `sequence` when you want both randomness and
uniqueness.

## Test framework integration

### RSpec

```ruby
# spec/spec_helper.rb (or rails_helper.rb for Rails)
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods   # enables `create(:user)` instead of `FactoryBot.create(:user)`
end

# spec/users_spec.rb
RSpec.describe User do
  it 'has a name' do
    user = create(:user)
    expect(user.name).to be_present
  end
end
```

### Minitest

```ruby
# test/test_helper.rb
class ActiveSupport::TestCase
  include FactoryBot::Syntax::Methods
end
```

Per [factory_bot-readme][readme]; both syntaxes mirror the same
DSL - only the test-framework hookup differs.

## Anti-patterns

| Anti-pattern                                                     | Why it fails                                                       | Fix |
|------------------------------------------------------------------|---------------------------------------------------------------------|-----|
| `FactoryBot.create(:user)` in every test, even for read-only assertions | Database overhead per test; suite slows linearly with test count. | Use `build_stubbed` for unit tests that don't exercise persistence; reserve `create` for integration tests. |
| One mega-factory with 30 attributes in the base                   | Every `create(:user)` writes 30 columns; tests that need 3 attributes pay the cost. | Minimal base factory + traits for the rich variants. |
| Per-test-class factory definitions                                | Two test files re-define `:user` differently; subtle bug. | One factory per class, in `spec/factories/` (auto-loaded by `factory_bot_rails`). |
| `sequence` for fields that should be **random** (e.g. names)       | Sequence values are predictable; tests pass on `User 1` `User 2` patterns that wouldn't pass on real names. | Use Faker for **value variety**, sequence for **uniqueness only**. |
| `create_list(:user, 100)` per test                                | DB write storm; even fast tests stall on bulk insert. | Use `build_stubbed_list` if persistence isn't required; if it is, use raw SQL bulk insert. |
| Factory associations that always create the parent                 | A test of `Post` creates a `User`; that creates 5 `Permission`s; etc. - explosion of objects. | Pass an existing parent: `create(:post, user: existing_user)`. |

## Limitations

- **Ruby-only.** For other languages: factory_boy (Python),
  fishery (TS), Bogus (.NET), MockK (Kotlin).
- **Auto-load only with `factory_bot_rails`.** Pure Ruby projects
  must require factory files manually.
- **No native support for `has_many through:`.** You can express it
  with `after(:create)` blocks, but the syntax is hand-rolled.
- **Sequence resets on test reload.** A long-running suite
  generates `user1@example.com` ... `user5000@example.com`. If
  asserting on the n-th sequence value, your test breaks when run
  in isolation.

## References

- [factory_bot-readme][readme] - canonical: install, factory
  definition, traits, associations, sequences, build / create /
  build_stubbed strategies.
- [`faker-data`](../faker-data/SKILL.md) - Ruby Faker (the value
  engine for FactoryBot fields).
- [`synthetic-data-tool-selector`](../synthetic-data-tool-selector/SKILL.md) - 
  dispatcher selecting the right factory library per language.
- [`seed-data-curator`](../seed-data-curator/SKILL.md) - downstream
  workflow consuming FactoryBot for E2E suite seeds.
