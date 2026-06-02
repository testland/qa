---
name: maestro-flows
description: "Authors mobile + web UI flows using Maestro - declarative YAML files (`tapOn`, `inputText`, `assertVisible`, `swipe`), supported targets (iOS, Android, Flutter, React Native, web), nested flow imports, JavaScript hooks for complex conditions. Use when the team wants the lowest barrier to entry for cross-platform mobile UI tests - YAML-first, no language compile step."
rating: 22
d6: 3
archetype: S1
---

# maestro-flows

## Overview

Per [maestro-docs][mae]:

[mae]: https://docs.maestro.dev/

> "Maestro [is] **the simplest and most effective framework for
> painless mobile and web UI automation using intuitive YAML
> flows**."

The flow file is the artifact - no compile step, no language
runtime to set up.

The platform ships three pieces ([maestro-docs][mae]):

> 1. **Maestro Studio** - A desktop application for visual test
>    creation without IDE setup
> 2. **Maestro CLI** - Command-line interface for installing,
>    managing devices, and running tests
> 3. **Maestro Cloud** - Integration with CI platforms like GitHub
>    Actions for parallel testing

## When to use

- A team needs cross-platform mobile UI tests with the lowest
  setup ceremony.
- Non-engineers (PMs, designers) need to write or read tests - 
  YAML is more accessible than Swift / Kotlin / JS.
- The product spans iOS + Android (and optionally Flutter / RN /
  web).
- Existing Detox / Appium suites would be overkill for the test
  count (5-30 critical flows).

If the team needs deep gray-box hooks (per-component intercepts),
[`detox-testing`](../detox-testing/SKILL.md) (RN) or framework-specific
unit/widget tests cover that better.

## Step 1 - Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version
```

Cross-platform: macOS, Linux, Windows (WSL recommended).

## Step 2 - Author a flow

```yaml
# .maestro/cart-flow.yaml
appId: com.example.app
---
- launchApp
- tapOn: "Sign in"
- inputText: "qa-test@example.com"
- tapOn: "Password"
- inputText: "test-password"
- tapOn: "Continue"
- assertVisible: "Welcome"
- tapOn: "Add to cart"
- assertVisible:
    text: "Cart"
    enabled: true
- tapOn: "Cart"
- assertVisible: "1 item"
- tapOn: "Checkout"
```

The file is YAML with `appId` declaration + `---` separator + a
list of commands. Commands map directly to user actions.

## Step 3 - Common commands

| Command           | Purpose                                                     |
|-------------------|-------------------------------------------------------------|
| `launchApp`       | Start the app fresh                                          |
| `tapOn: "<text>"` | Tap an element with visible text                             |
| `tapOn: { id: "..." }` | Tap by accessibility ID                                |
| `inputText: "..."`| Type text into the focused field                             |
| `assertVisible: "..."` | Assert element is visible                              |
| `assertNotVisible: "..."` | Assert element is NOT visible                       |
| `swipe: { direction: UP }` | Swipe                                              |
| `scrollUntilVisible: { element: { text: "..." } }` | Scroll until found |
| `back`            | Press back / navigate back                                   |
| `pressKey: ENTER` | Synthesize a hardware key                                    |
| `takeScreenshot`  | Capture screenshot to artifact dir                            |
| `runFlow: "<other.yaml>"` | Compose flows                                       |
| `evalScript: "<js>"` | Run JavaScript for complex conditions                    |

## Step 4 - Flow modularity

```yaml
# .maestro/login.yaml
appId: com.example.app
---
- launchApp
- tapOn: "Sign in"
- inputText:
    text: ${EMAIL}     # env-variable interpolation
- tapOn: "Password"
- inputText: ${PASSWORD}
- tapOn: "Continue"
- assertVisible: "Welcome"
```

```yaml
# .maestro/cart-flow.yaml
appId: com.example.app
---
- runFlow: "login.yaml"
- tapOn: "Add to cart"
- assertVisible: "1 item"
```

The `runFlow` composition keeps shared paths (login, navigation)
DRY across the test suite.

## Step 5 - JavaScript hooks for complex conditions

```yaml
- evalScript: |
    output.timestamp = new Date().toISOString();

- inputText: ${output.timestamp}
- tapOn: "Save"

# Conditional flow
- runFlow:
    when:
      visible: "Onboarding"
    file: "skip-onboarding.yaml"
```

`evalScript` reads + writes to an `output` object that subsequent
commands can reference. `when` makes commands conditional.

## Step 6 - Run

```bash
# Single flow
maestro test .maestro/cart-flow.yaml

# Whole directory
maestro test .maestro/

# With env vars
EMAIL=qa-test@example.com PASSWORD=test maestro test .maestro/
```

## Step 7 - Studio for visual authoring

```bash
maestro studio
```

Opens a desktop app showing the connected device + an inspector for
each tapped element. Click an element → Studio generates the
corresponding YAML command. For non-engineers, this dramatically
shortens the authoring loop.

## Step 8 - CI integration

```yaml
# .github/workflows/maestro.yml
jobs:
  maestro-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: |
            curl -Ls "https://get.maestro.mobile.dev" | bash
            export PATH="$HOME/.maestro/bin:$PATH"
            maestro test .maestro/

  maestro-ios:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v5
      - run: |
          xcrun simctl boot 'iPhone 15'
          curl -Ls "https://get.maestro.mobile.dev" | bash
          export PATH="$HOME/.maestro/bin:$PATH"
          maestro test .maestro/
```

For matrix runs across N devices in parallel, use Maestro Cloud
(per [maestro-docs][mae]) - handles farm-side parallelism without
local emulator orchestration.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `tapOn` text that's translated                                        | Tests fail in non-English locales.                                        | Use `tapOn: { id: "..." }` for stable lookups. |
| One mega-flow with 100 steps                                          | Failure mid-flow obscures cause; reruns repeat all 100 steps.            | Modularize via `runFlow` (Step 4). |
| Hard-coded credentials in YAML                                        | Secrets in git.                                                           | Env vars + `${VAR}` interpolation (Step 4). |
| `evalScript` for everything (writing tests in JS via YAML)            | Defeats Maestro's YAML simplicity.                                        | Use `evalScript` only for genuinely complex conditions. |
| `swipe` without direction / verification                              | Swipes vary per platform; visible state may not change.                   | `assertVisible` after swipe to confirm state changed. |
| Skipping `appId` declaration                                          | Maestro can't tell which app to drive; ambiguous failures.               | Always declare `appId` (Step 2). |

## Limitations

- **No deep state inspection.** Maestro is UI-level; for assertions
  on app internals (Redux state, network calls), gray-box frameworks
  ([`detox-testing`](../detox-testing/SKILL.md)) fit better.
- **Per-platform UI quirks.** Same YAML may behave differently
  iOS vs Android (toast positioning, keyboard interaction);
  per-platform branching via `evalScript` may be needed.
- **Limited debugging tools.** Failure debugging relies on
  screenshots + studio replay; less rich than IDE-debugger
  integration.
- **Cloud features behind Maestro Cloud.** Parallel matrix runs +
  per-device farms are paid (per [maestro-docs][mae]).

## References

- [mae][mae] - Maestro overview: YAML flows, three-component model
  (CLI / Studio / Cloud), modular learning path.
- [`detox-testing`](../detox-testing/SKILL.md),
  [`appium-testing`](../appium-testing/SKILL.md) - alternative
  cross-platform frameworks with deeper hooks.
- [`xcuitest-suite`](../xcuitest-suite/SKILL.md),
  [`espresso-suite`](../espresso-suite/SKILL.md) - native
  alternatives for single-platform.
