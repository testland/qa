---
name: at-spi-linux
description: "Authors Linux desktop UI tests via AT-SPI - the DBus-based Assistive Technology Service Provider Interface implemented by `at-spi2-core` (registry daemon + `libatspi` C library + ATK GTK bridge). Covers enabling toolkit accessibility (`gsettings set org.gnome.desktop.interface toolkit-accessibility true`), driving GTK + Qt apps through Python `dogtail` (object-oriented + procedural APIs), inspecting the tree with Accerciser, scripting via `pyatspi`, and CI integration on headless Linux runners with `Xvfb` + `dbus-launch`. Use for Linux-side desktop tests of GTK applications, Qt apps with QAccessible enabled, and Electron apps on Linux."
keywords:
  - linux
  - at-spi
  - dogtail
  - gtk
  - accessibility
  - dbus
---

# at-spi-linux

## Overview

AT-SPI (Assistive Technology Service Provider Interface) is the
Linux desktop accessibility stack - a DBus-based protocol that
exposes an application's UI tree to assistive technologies (screen
readers, magnifiers) **and** to test clients. Per the
[at-spi2-core README][atspi2coreraw]:

[atspi2coreraw]: https://gitlab.gnome.org/GNOME/at-spi2-core/-/raw/main/README.md

> "AT-SPI2-Core is the core of an accessibility stack for free
> software systems."

It provides ([atspi2coreraw][atspi2coreraw]) "DBus interface
definitions for the Assistive Technology Service Provider Interface"
plus four runtime pieces:

| Component ([atspi2coreraw][atspi2coreraw]) | Role |
|---|---|
| `registryd` | "Daemon managing accessible applications and enabling communication between assistive technologies and applications." |
| `atspi` | "C language binding for DBus accessibility interfaces." |
| `atk` | "GObject-based API for implementing accessible applications and GUI toolkits." |
| `atk-adaptor` | "Translates ATK API calls to the atspi API layer." |

GTK applications publish accessibility via ATK; Qt applications
publish via Qt's own `QAccessible` infrastructure, which exposes an
AT-SPI surface on Linux. **Either** path lets a test client walk the
tree.

Strategic frame:
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
places AT-SPI alongside Windows UIA and macOS XCTest as the three OS-
native accessibility-tree backends.

## When to use

- Linux GTK app under test (GNOME apps, GTK4 + GTK3 apps).
- Qt application on Linux where in-process
  [`qt-test-framework`](../qt-test-framework/SKILL.md) doesn't fit
  (test must drive a separately-packaged binary).
- Electron / Chromium app on Linux that needs out-of-process
  driving and Playwright `_electron` isn't acceptable (e.g.,
  accessibility-conformance audit suites running against the
  shipped binary).
- BDD-style acceptance tests via `dogtail` + `behave`
  ([dogtailraw][dogtailraw]).

[dogtailraw]: https://gitlab.com/dogtail/dogtail/-/raw/master/README.md

## Step 1 - Enable toolkit accessibility

Per the [dogtail README][dogtailraw]:

```bash
gsettings set org.gnome.desktop.interface toolkit-accessibility true
```

Without this setting, GTK applications publish nothing to the AT-SPI
bus and tree-walking clients see an empty desktop.

For Qt apps, the equivalent is exporting `QT_ACCESSIBILITY=1` in the
environment that launches the Qt binary - without it Qt's
`QAccessible` infrastructure stays inactive and the AT-SPI tree
contains no Qt children.

For Electron / Chromium, set `--force-renderer-accessibility` on the
binary launch (or `--enable-blink-features=AccessibilityAriaVirtualContent`
for newer Chromium accessibility surfaces).

## Step 2 - Install dogtail

Per [dogtailraw][dogtailraw]:

```bash
# From PyPI
sudo python3 -m pip install dogtail

# From source
git clone https://gitlab.com/dogtail/dogtail.git
cd dogtail
python3 -m build
sudo pip3 install dist/dogtail-2.*-py3-none-any.whl
```

The [dogtail README][dogtailraw] notes that "for Wayland support
specifically: Install `gnome-ponytail-daemon`":

```bash
dnf install -y gnome-ponytail-daemon python3-gnome-ponytail-daemon
```

This bridges synthetic input events on Wayland sessions where direct
X-style event injection isn't available.

## Step 3 - Inspect the tree (Accerciser)

Before writing tests, walk the live tree with **Accerciser** (the
GNOME accessibility inspector). It's the AT-SPI analogue of
Inspect.exe (Windows) and Accessibility Inspector (macOS, per
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)).

```bash
# Most distros:
sudo apt install accerciser   # Debian / Ubuntu
sudo dnf install accerciser   # Fedora
accerciser
```

Accerciser walks the same `registryd`-published tree the test
client sees, and lets the author copy out the exact role + name +
description triple for each widget - which is what `dogtail`
queries against.

## Step 4 - Author a dogtail test (procedural API)

Per [dogtailraw][dogtailraw], dogtail "uses Accessibility (AT-SPI)
technologies to interact with desktop applications". The procedural
API is the closest mirror to the underlying AT-SPI tree:

```python
#!/usr/bin/env python3
from dogtail.procedural import run, focus, click, type, keyCombo
from dogtail.utils import screenshot

# Launch the app - dogtail starts it and attaches to the AT-SPI tree
run('gnome-calculator')

# Resolve via the accessibility tree (focus + click are role-based)
focus.application('gnome-calculator')
focus.frame('Calculator')

click('7')                    # button named "7"
click('+')
click('3')
click('=')

# Assert via the result widget
focus.text(roleName='editbox')
assert focus.widget.text == '10', f'Expected 10, got {focus.widget.text!r}'

screenshot('calc-success.png')
```

The role-based primitives (`focus.application`, `focus.frame`,
`focus.text`, `click`, `type`) map onto AT-SPI roles published by
the application - same primitives Orca screen reader uses.

## Step 5 - Author a dogtail test (object-oriented API)

For larger suites where a Page-Object-style structure is
appropriate, the object-oriented `tree` API exposes the registry as
a navigable graph:

```python
from dogtail.tree import root

calc = root.application('gnome-calculator')
frame = calc.child(roleName='frame')

frame.button('7').click()
frame.button('+').click()
frame.button('3').click()
frame.button('=').click()

result = frame.child(roleName='editbox')
assert result.text == '10'
```

`root` is the AT-SPI desktop entry point - dogtail's wrapper over
the `libatspi` `get_desktop()` function described in the
[libatspi reference][atspi2docs]:

[atspi2docs]: https://docs.gtk.org/atspi2/index.html

> "init() … connects to the accessibility registry and initializes
> the SPI."

> "get_desktop() and get_desktop_list() to access the accessibility
> tree once connected."

## Step 6 - Direct pyatspi for fine-grained control

For tests that need to listen for events on the AT-SPI bus rather
than poll the tree, drop down to `pyatspi`:

```python
import pyatspi

def on_state_change(event):
    if event.type == 'object:state-changed:focused' and event.detail1:
        print(f'Focus moved to: {event.source.name} ({event.source.getRoleName()})')

pyatspi.Registry.registerEventListener(
    on_state_change,
    'object:state-changed:focused',
)
pyatspi.Registry.start()   # blocks; Ctrl-C to exit
```

This uses the AT-SPI event-listener pattern documented in
[atspi2docs][atspi2docs]:

> "AtspiEventListener operates through a callback mechanism. The
> library defines a generic interface implemented by objects for
> the receipt of event notifications."

## Step 7 - Run

```bash
# Standalone - assumes accessibility is enabled + an X / Wayland session
python3 tests/test_calculator.py

# Under pytest with JUnit output
pytest tests/ --junitxml=reports/atspi-junit.xml
```

## Step 8 - Parsing results

JUnit XML from pytest feeds
[`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)
for the cross-runner aggregation pipeline.

For dogtail-specific diagnostics, every failing run captures a
screenshot (see Step 4 - `screenshot()` call) plus a `dogtail`
session log under `~/.dogtail/logs/`.

## Step 9 - CI integration

The Linux runner needs a display server + session DBus bus before
AT-SPI clients can connect:

```yaml
# .github/workflows/atspi.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install AT-SPI + dogtail + app + Accerciser deps
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            at-spi2-core \
            python3-dogtail python3-pyatspi \
            xvfb dbus-x11 gnome-calculator
      - name: Enable accessibility for GTK
        run: |
          gsettings set org.gnome.desktop.interface toolkit-accessibility true \
            || true   # the schema needs a session bus; the env block below ensures it
      - name: Run tests under Xvfb + dbus-launch
        env:
          QT_ACCESSIBILITY: '1'
        run: |
          xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24' \
            dbus-launch --exit-with-session \
              pytest tests/ --junitxml=reports/atspi-junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit
          path: reports/
```

`xvfb-run` provides the X display, `dbus-launch --exit-with-session`
spawns the session DBus bus (`at-spi2-registryd` requires the session
bus per [atspi2coreraw][atspi2coreraw] - without it the registry
daemon refuses to start). This matches the CI guidance in the
[`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md)
anti-patterns table.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Running dogtail tests without `toolkit-accessibility=true` | GTK apps publish nothing; tree is empty | `gsettings set org.gnome.desktop.interface toolkit-accessibility true` ([dogtailraw][dogtailraw]) |
| Driving Qt apps with `QT_ACCESSIBILITY` unset | `QAccessible` stays inactive; AT-SPI tree has no Qt children | Export `QT_ACCESSIBILITY=1` in the launch env (Step 1) |
| CI runner without `dbus-launch` | `registryd` refuses to start; sessions hang on attach | `xvfb-run … dbus-launch … pytest …` (Step 9) |
| Locating by visible label only | Localisation breaks the locator | Combine `roleName=` + accessible name; set `Atk.set_accessible_name(...)` from app code |
| `time.sleep(2)` between actions | Flaky; brittle | Use dogtail's `doDelay` config (`config.searchBackoffDuration`) and tree polling helpers ([dogtailraw][dogtailraw]) |
| Wayland session without `gnome-ponytail-daemon` | Synthetic input events get dropped | Install daemon per [dogtailraw][dogtailraw] |
| Mixing X test runner with Wayland app under test | Event injection mismatch | One session type per CI job; matrix-build over Xorg + Wayland separately |
| Test relies on Accerciser running concurrently | Two clients on the same registry race on tree refresh | Use Accerciser interactively for authoring; remove from CI runs |

## Limitations

- **Linux-only.** AT-SPI runs only on Linux desktops; cross-OS
  parity lives in
  [`winappdriver`](../winappdriver/SKILL.md) (Windows) and
  [`xctest-mac-desktop`](../xctest-mac-desktop/SKILL.md) (macOS).
- **Session-bus requirement.** `at-spi2-registryd` requires a
  session DBus bus per [atspi2coreraw][atspi2coreraw]; bare Docker
  containers (no session bus) need `dbus-launch`. GitHub-hosted
  Ubuntu runners ship with the bus but headless self-hosted
  runners don't necessarily.
- **GTK4 shadow rendering quirks** require disabling window
  shadows in `~/.config/gtk-4.0/gtk.css` per
  [dogtailraw][dogtailraw]; otherwise click-coordinates land on the
  shadow region rather than the widget.
- **No first-party Wayland event-injection guarantee.** Recent
  Wayland compositors (mutter, kwin) restrict synthetic input;
  `gnome-ponytail-daemon` ([dogtailraw][dogtailraw]) is the
  documented workaround on GNOME Wayland sessions.
- **Apps must publish accessibility.** Custom-drawn widgets that
  bypass GTK/Qt/Chromium accessibility (e.g., raw OpenGL canvases,
  custom-painted Cairo surfaces) are opaque to AT-SPI - same
  caveat as
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- **dogtail API docs incomplete.** Per [dogtailraw][dogtailraw],
  "API docs (incomplete for both versions, in progress for 2.x)" - 
  some method signatures need source-spelunking.

## References

- at-spi2-core README - [atspi2coreraw][atspi2coreraw].
- libatspi (AT-SPI 2.0) reference - [atspi2docs][atspi2docs].
- dogtail README - [dogtailraw][dogtailraw].
- Strategic frame:
  [`desktop-test-strategy-reference`](../desktop-test-strategy-reference/SKILL.md).
- Sibling skills in this plugin:
  [`winappdriver`](../winappdriver/SKILL.md),
  [`xctest-mac-desktop`](../xctest-mac-desktop/SKILL.md),
  [`qt-test-framework`](../qt-test-framework/SKILL.md),
  [`electron-playwright`](../electron-playwright/SKILL.md).
- Downstream:
  [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).
