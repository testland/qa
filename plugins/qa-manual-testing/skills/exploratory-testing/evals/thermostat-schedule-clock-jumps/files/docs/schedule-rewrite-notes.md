# Heating schedule rewrite - notes for beta

## What the app sends

- A programme is a list of setpoint changes per weekday, in local wall-clock
  time, plus an optional holiday override range and an "away until" hold.
- The app resolves wall-clock times to UTC using the home's timezone and
  sends absolute times for the next 7 days, refreshed nightly at 02:15
  local.
- The device applies whatever it last received; if it has not heard from the
  service in 48 hours it falls back to the last full week it holds.

## What changed

- The nightly refresh is new; previously the device stored a repeating
  weekly programme and resolved times itself.
- Holiday overrides are new.
- The "away until" hold now survives an app restart. It did not before.

## Known and suspected problems

- The nightly refresh at 02:15 local falls inside the ambiguous hour on the
  autumn changeover night in several European timezones.
- A holiday override that spans the changeover has never been exercised.
- The device's 48-hour fallback holds absolute times, so a device that goes
  offline before the changeover and comes back after it runs the pre-change
  programme.
- Setting "away until" to a moment inside the repeated hour was rejected by
  the API in a developer's manual test; not reproduced or written up.

## Rig

- Shared device bench: 6 thermostats, 2 clock jumps per day across the whole
  bench, roughly 10 minutes to propagate.
- Devices can be taken offline individually by pulling them from the bench
  network.
- Service-side timezone for a test home can be changed instantly from the
  admin console; the device clock cannot.
- App builds install on the bench tablets in under a minute.
