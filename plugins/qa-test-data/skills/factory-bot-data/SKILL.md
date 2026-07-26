---
name: factory-bot-data
description: "Authors Ruby FactoryBot factories with traits, associations, sequences, and the three build strategies (build / create / build_stubbed); integrates with RSpec / Minitest test suites; pairs with Faker for randomized field values. Use when the project is Ruby / Rails and needs structured fixture creation with referential integrity."
---

# factory-bot-data

## Overview

FactoryBot (formerly factory_girl) is the canonical Ruby fixture-
factory library - it builds object graphs with referential integrity
that raw `faker-data` cannot
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

## How to use

1. Add `factory_bot_rails` (Rails) or `factory_bot` to the test group and require it.
2. Define one base factory per model in `spec/factories/`, one attribute block each.
3. Add `trait` blocks for variants (`:admin`, `:with_posts`) instead of separate variant factories.
4. Wire `Faker` into attribute blocks for randomized values; use `.unique` where uniqueness matters.
5. Pick a build strategy per test: `build_stubbed` for unit, `build` for no-DB, `create` for persistence.
6. Include `FactoryBot::Syntax::Methods` in the RSpec / Minitest config to call `create(:user)` directly.
7. Call the factory in the test and assert on the returned object.

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

FactoryBot supports three: `build` (unsaved), `create` (persisted with
associations), and `build_stubbed` (fake-persisted, never hits the DB).
Speed hierarchy: `build_stubbed` >> `build` >> `create` - use the
weakest one that still tests what you need. Full table and examples:
[references/strategies-and-anti-patterns.md](references/strategies-and-anti-patterns.md).

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

## Worked example

A test needs an admin user that owns three posts. Define the factory
with two traits and Faker-backed values:

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name  { Faker::Name.name }
    email { Faker::Internet.unique.email }

    trait :admin do
      role { "admin" }
    end

    trait :with_posts do
      after(:create) { |user| create_list(:post, 3, user: user) }
    end
  end
end
```

Compose both traits in one intent-revealing call:

```ruby
RSpec.describe User do
  it 'admin owns three posts' do
    user = create(:user, :admin, :with_posts)
    expect(user.role).to eq('admin')
    expect(user.posts.count).to eq(3)
  end
end
```

`create` persists the user and, via the `:with_posts` `after(:create)`
hook, its three posts - one line instead of six lines of manual setup.

## Anti-patterns

Common FactoryBot pitfalls - `create` for read-only tests, mega base
factories, per-test-class definitions, `sequence` where values should
be random, bulk `create_list`, and always-create associations - and
their fixes are catalogued in
[references/strategies-and-anti-patterns.md](references/strategies-and-anti-patterns.md).

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
- `faker-data` - Ruby Faker (the value
  engine for FactoryBot fields).
- `synthetic-data-tool-selector` - 
  dispatcher selecting the right factory library per language.
- `seed-data-curator` - downstream
  workflow consuming FactoryBot for E2E suite seeds.
