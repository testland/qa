---
name: timecop-ruby
description: "Wraps timecop (github.com/travisjeffery/timecop), the Ruby time-mocking gem: Timecop.freeze, Timecop.travel, Timecop.scale (time-speedup), Timecop.return (cleanup), and RSpec-friendly helpers. Use when testing Ruby/Rails code that calls Time / Date / DateTime. Composes dst-transition-reference + iso-8601-vs-rfc-3339-reference."
rating: 21
d6: 4
archetype: S1
---

# timecop-ruby

## Overview

`timecop` is the canonical Ruby gem for time mocking. Per
[github.com/travisjeffery/timecop](https://github.com/travisjeffery/timecop),
it patches `Time.now`, `Date.today`, `DateTime.now`, and
`Time.new` to return controllable values.

## When to use

- RSpec / minitest tests for Ruby/Rails code using Time / Date.
- Date-based fixtures.
- Cron / scheduled-job tests.

## Authoring

### Install

```ruby
# Gemfile
group :test do
  gem 'timecop'
end
```

```bash
bundle install
```

### Timecop.freeze (snapshot)

```ruby
require 'timecop'

Timecop.freeze(Time.local(2026, 5, 20, 14, 30)) do
  expect(Time.now.strftime('%Y-%m-%d')).to eq('2026-05-20')
end
# Time auto-restored after block
```

### Timecop.travel (clock continues)

```ruby
Timecop.travel(Time.local(2026, 12, 31, 23, 59, 0)) do
  sleep 5  # Real sleep
  expect(Time.now).to be_within(6.seconds).of(Time.local(2026, 12, 31, 23, 59, 5))
end
```

freeze pauses; travel keeps the clock ticking from the offset.

### Manual control

```ruby
Timecop.freeze(Time.local(2026, 5, 20, 14, 30))
# ... test code
Timecop.return  # Restore
```

Use `ensure` blocks to guarantee cleanup:

```ruby
def test_something
  Timecop.freeze(...)
  begin
    # ...
  ensure
    Timecop.return
  end
end
```

### Timecop.scale (time-speedup)

```ruby
Timecop.scale(3600) do            # 1 real-second = 1 simulated-hour
  start = Time.now
  sleep 1  # 1 sec real = 1hr simulated
  delta = Time.now - start
  expect(delta).to be_within(60).of(3600)
end
```

### DST tests

```ruby
require 'active_support/time'

Time.zone = 'America/New_York'
Timecop.freeze(Time.zone.local(2026, 3, 8, 2, 30, 0)) do
  # Behaviour depends on Time.zone library — Rails ActiveSupport
  # has known DST-handling
  expect(...).to ...
end
```

### RSpec helper

```ruby
# spec_helper.rb
RSpec.configure do |config|
  config.after(:each) { Timecop.return }   # Ensure cleanup
end
```

### Rails: rails-controller-testing + timecop

```ruby
RSpec.describe BookingController do
  it 'rejects past dates' do
    Timecop.freeze(Date.new(2026, 5, 20)) do
      post :create, params: { date: '2026-05-19' }
      expect(response.status).to eq(400)
    end
  end
end
```

## Running

```bash
bundle exec rspec
bundle exec ruby -Itest test/
```

## CI integration

```yaml
jobs:
  ruby-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: ruby/setup-ruby@v1
        with: { bundler-cache: true }
      - run: bundle exec rspec
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget `Timecop.return` | Cross-test contamination | RSpec after-each hook |
| Use freeze + sleep | sleep is real-time; clock stays frozen | Use travel or scale |
| Hardcode `Time.zone` in tests | Cross-test config bleed | Save/restore tz per test |
| Test DST without ActiveSupport zone | Ruby `Time` doesn't track zones natively | Use ActiveSupport `Time.zone` |
| Mock `Time.now` separately from Timecop | Conflict | Use Timecop exclusively |
| Use `Date.today` without freeze | Tests fail at midnight | Always freeze |
| Treat travel and freeze identically | Different semantics | Use freeze when clock shouldn't advance |

## Limitations

- **C extensions bypass timecop.** Native gems calling clock_gettime
  aren't patched.
- **No leap-second simulation.**
- **`Time.zone` (ActiveSupport) and `Time` may diverge.** Be
  explicit which you're testing.
- **`Date.parse` in Ruby uses real-system locale.** Doesn't
  honor Timecop.

## References

- timecop:
  [github.com/travisjeffery/timecop](https://github.com/travisjeffery/timecop).
- ActiveSupport Time:
  [api.rubyonrails.org/classes/ActiveSupport/TimeWithZone.html](https://api.rubyonrails.org/classes/ActiveSupport/TimeWithZone.html).
- Companion catalogs:
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Cross-language:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`freezegun-python`](../freezegun-python/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
