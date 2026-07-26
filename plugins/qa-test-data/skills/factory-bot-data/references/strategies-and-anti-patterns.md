# FactoryBot build strategies and anti-patterns

Reference detail for [factory-bot-data](../SKILL.md): the three build
strategies and the factory anti-pattern catalog.

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

[readme]: https://github.com/thoughtbot/factory_bot

## Anti-patterns

| Anti-pattern                                                     | Why it fails                                                       | Fix |
|------------------------------------------------------------------|---------------------------------------------------------------------|-----|
| `FactoryBot.create(:user)` in every test, even for read-only assertions | Database overhead per test; suite slows linearly with test count. | Use `build_stubbed` for unit tests that don't exercise persistence; reserve `create` for integration tests. |
| One mega-factory with 30 attributes in the base                   | Every `create(:user)` writes 30 columns; tests that need 3 attributes pay the cost. | Minimal base factory + traits for the rich variants. |
| Per-test-class factory definitions                                | Two test files re-define `:user` differently; subtle bug. | One factory per class, in `spec/factories/` (auto-loaded by `factory_bot_rails`). |
| `sequence` for fields that should be **random** (e.g. names)       | Sequence values are predictable; tests pass on `User 1` `User 2` patterns that wouldn't pass on real names. | Use Faker for **value variety**, sequence for **uniqueness only**. |
| `create_list(:user, 100)` per test                                | DB write storm; even fast tests stall on bulk insert. | Use `build_stubbed_list` if persistence isn't required; if it is, use raw SQL bulk insert. |
| Factory associations that always create the parent                 | A test of `Post` creates a `User`; that creates 5 `Permission`s; etc. - explosion of objects. | Pass an existing parent: `create(:post, user: existing_user)`. |
