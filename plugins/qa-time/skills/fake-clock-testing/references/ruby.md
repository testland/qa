# Ruby - timecop

`timecop` is the canonical Ruby time-mocking gem. Per
[github.com/travisjeffery/timecop](https://github.com/travisjeffery/timecop),
it patches `Time.now`, `Date.today`, `DateTime.now`, and `Time.new`.

## Install

```ruby
# Gemfile
group :test do
  gem 'timecop'
end
```

## Timecop.freeze (snapshot) vs Timecop.travel (clock continues)

```ruby
Timecop.freeze(Time.local(2026, 5, 20, 14, 30)) do
  expect(Time.now.strftime('%Y-%m-%d')).to eq('2026-05-20')
end  # auto-restored after the block

Timecop.travel(Time.local(2026, 12, 31, 23, 59, 0)) do
  sleep 5  # real sleep; travel keeps the clock ticking from the offset
  expect(Time.now).to be_within(6.seconds).of(Time.local(2026, 12, 31, 23, 59, 5))
end
```

freeze pauses the clock; travel offsets it and lets it keep ticking. They
are not interchangeable - use freeze when the clock must not advance.

## Manual control and cleanup

```ruby
Timecop.freeze(Time.local(2026, 5, 20, 14, 30))
# ... test code
Timecop.return    # restore; wrap in ensure when not using the block form
```

RSpec safety net:

```ruby
RSpec.configure do |config|
  config.after(:each) { Timecop.return }
end
```

## Timecop.scale (time speed-up)

```ruby
Timecop.scale(3600) do            # 1 real second = 1 simulated hour
  start = Time.now
  sleep 1
  expect(Time.now - start).to be_within(60).of(3600)
end
```

## DST tests (Rails / ActiveSupport)

Ruby `Time` doesn't track zones natively; use ActiveSupport's `Time.zone`:

```ruby
require 'active_support/time'

Time.zone = 'America/New_York'
Timecop.freeze(Time.zone.local(2026, 3, 8, 2, 30, 0)) do
  # 02:30 local doesn't exist on this spring-forward date;
  # assert the documented behaviour per dst-transition-reference
end
```

Save and restore `Time.zone` per test - it is process-global config.

## Rails controller example

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget `Timecop.return` | Cross-test contamination | RSpec after-each hook |
| freeze + `sleep` | Sleep is real-time; the frozen clock stays put | Use travel or scale |
| Hardcode `Time.zone` in tests | Config bleeds across tests | Save/restore the zone per test |
| DST test without ActiveSupport zone | Ruby `Time` has no zone tracking | `Time.zone` + `Time.zone.local` |
| `Date.today` without a freeze | Test fails at midnight | Always freeze |

## Limitations

- **C extensions bypass timecop** - native gems calling `clock_gettime`
  aren't patched; use libfaketime ([libfaketime.md](libfaketime.md)).
- **`Time.zone` (ActiveSupport) and `Time` can diverge** - be explicit
  about which the code under test reads.
- **`Date.parse` uses the real system locale** and does not honor Timecop.

## References

- timecop: [github.com/travisjeffery/timecop](https://github.com/travisjeffery/timecop)
- ActiveSupport TimeWithZone:
  [api.rubyonrails.org/classes/ActiveSupport/TimeWithZone.html](https://api.rubyonrails.org/classes/ActiveSupport/TimeWithZone.html)
