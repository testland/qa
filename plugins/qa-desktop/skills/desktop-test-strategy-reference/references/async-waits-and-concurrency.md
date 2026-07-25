# Asynchronous waits and concurrency per OS

Deep reference for `desktop-test-strategy-reference` SKILL.md. Consult
after picking the OS backend, when wiring the actual waits and the
parallel-run policy.

## Asynchronous waits per OS

Every reliable desktop test routes UI polls through the driver's
retry primitive, never raw `Thread.Sleep` / `Task.Delay`. The three
backends ship distinct mechanisms.

**macOS - three-tier XCTest hierarchy** ([XCUIElement.waitForExistence][appwait1],
[Asynchronous Tests and Expectations][appwait2]):

[appwait1]: https://developer.apple.com/documentation/xctest/xcuielement/2879412-waitforexistence
[appwait2]: https://developer.apple.com/documentation/xctest/asynchronous-tests-and-expectations

| Mechanism | Use when |
|---|---|
| `waitForExistence(timeout:)` - boolean, fastest | Single existence check |
| `XCTestExpectation` + `waitForExpectations(timeout:)` | Custom predicate |
| `XCTWaiter` - multi-expectation, returns enum | Composing several conditions |

Predicate-based waits expose no polling-interval setting - prefer
`waitForExistence` for simple existence checks, escalate only when
the wait is on a custom predicate.

**Windows - FlaUI `Retry` primitives** ([FlaUI Retry wiki][flauiretry]) parameterise any UI
poll with explicit `timeout` and `interval` `TimeSpan` values.
Defaults are not documented - pass them explicitly. Typical
interval: 100 to 200ms (10ms hammers UIA; 1s hides 100ms races).

[flauiretry]: https://github.com/FlaUI/FlaUI/wiki/Retry

| Primitive | Use when |
|---|---|
| `Retry.WhileNull(func, timeout, interval)` | Element fetch |
| `Retry.WhileFalse(func, timeout, interval)` | Boolean state |
| `Retry.WhileException(func, timeout, interval)` | Transient throws during element creation |

**Linux - AT-SPI manual polling.** No built-in retry primitive; the
dogtail / pyatspi community pattern is an explicit `time.time()`
polling loop with `timeout` + `interval` (100 to 250ms balances
responsiveness against `at-spi2-registryd` D-Bus traffic).

## Concurrency: per-OS parallel-test policy

**macOS** - per [Apple - Running tests serially or in parallel][appleparallel],
parallelisation is opt-in. The cited page is under Apple's modern
`documentation/testing/` (Swift Testing) namespace; the same opt-in
design applies to XCTest test plans, which are configured in Xcode
(Edit Scheme -> Test -> Options -> Execute in parallel on Simulator).
Tests sharing mutable state must opt out; performance bundles must
disable parallelisation (parallel introduces timing noise). On
macOS the Simulator clones spin per worker - real disk + RAM cost.

[appleparallel]: https://developer.apple.com/documentation/testing/parallelization

**Windows** - UIA is per-session: one AutomationElement tree per
interactive Windows session. Two workers in the same session race
for foreground (the Windows foreground-lock hazard). Scaling: one
runner per VM, or one RDP / per-user session per worker.

**Linux** - `at-spi2-registryd` is bound to one D-Bus session.
Workers writing events into the same session race for focus.
Scaling: one Xvfb + dbus-launch per worker, or one container per
worker with its own session bus.
