# Ninety minutes and only two clock jumps

## Problem Description

The heating-schedule rewrite in our thermostat companion app ships to the
beta ring next week. Customers set weekday and weekend schedules, holiday
overrides, and a "away until" hold, and the app pushes the resulting
programme to the device.

The clocks go back in nine days. Last year we shipped a schedule change in
October and a few hundred customers had their heating come on an hour late
on the changeover morning; support absorbed it, the CEO heard about it, and
we are not doing that again.

Rita has one 90-minute window on Thursday afternoon. The test rig is the
constraint that shapes everything: the shared device bench lets us jump the
device clock, but the platform team allows two jumps per day across the
whole bench and each one takes about ten minutes to propagate to the devices
before anything is worth observing. Rita gets both of Thursday's jumps if
she wants them, but there is no third.

She cannot flash firmware - that needs the hardware lab and a booking - so
whatever she does is app-side and device-behaviour observation only.

One more thing. Our team has a habit of dropping findings into the squad
chat channel and moving on. Two of last year's changeover reports are
somewhere in a thread nobody can find. That is not happening this time.

## Output Specification

Produce a single file: `docs/qa/thermostat-schedule-window.md`.

It must contain:

1. One stated objective for the 90 minutes: the area, what Rita works with,
   and what we need to know before the beta ring.
2. How the two clock jumps are spent - when each is used, to what target
   moment, and what is set up beforehand so the jump is not wasted.
3. What Rita does with the roughly twenty minutes lost to propagation.
4. The parts of the schedule feature deliberately left untouched in this
   window, and why.
5. What she records as she goes, split so a reader can tell apart defects,
   device behaviour that is merely unexplained, and rig problems that cost
   her time.
6. Where the write-up lives at the end, what it contains, who reads it and
   by when.

Available: one 90-minute window, one tester, two clock jumps, no third.
Out of scope: firmware flashing, the hardware lab, the voice-assistant
integration, and multi-zone homes.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/schedule-rewrite-notes.md ===============
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
