# Platform foreground, elevation hazards, and high-DPI matrix

Deep reference for `desktop-test-strategy-reference` SKILL.md. Consult
when a run intermittently loses focus, cannot dismiss an OS prompt, or
must cover multi-monitor DPI scenarios.

## Platform foreground + elevation hazards

The two failure classes most often misdiagnosed as "flaky tests"
on desktop are actually documented platform behaviours.

### Windows foreground-lock

Per [Microsoft - SetForegroundWindow][winsetfg] and
[Microsoft - LockSetForegroundWindow][winlockfg]:

[winsetfg]: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow
[winlockfg]: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-locksetforegroundwindow

`SetForegroundWindow` can be refused by Windows. The foreground
process can also call `LockSetForegroundWindow` to suppress
foreground transfer entirely. The system re-enables the transfer
when the user presses ALT or interacts with a background window -
neither of which happens in CI. Modal dialogs and active menus
also suppress it. Symptoms in test logs: a click "succeeds" but
the next action observes the previous window.

Mitigations:

- Activate the app explicitly (`app.Activate()` in FlaUI,
  `app.activate()` in XCUITest, `pyatspi` window-activation event
  on Linux) before every Act that depends on focus.
- On CI Windows runners, disable foreground-lock for the test session:
  `HKEY_CURRENT_USER\Control Panel\Desktop\ForegroundLockTimeout = 0`.
- Avoid running other apps in the same session during the test.

### Windows UAC: the secure desktop is unreachable

Per the WinAppDriver maintainers
([issue #306][wad306], [issue #2033][wad2033]):

[wad306]: https://github.com/microsoft/WinAppDriver/issues/306
[wad2033]: https://github.com/microsoft/WinAppDriver/issues/2033

The UAC consent prompt renders on a **secure desktop** that lives
outside the standard accessibility tree. WinAppDriver / UIA cannot
interact with the consent button - by Windows design, not driver
bug. Three supported workarounds:

- Run the test session itself elevated (the simplest, the prevailing
  CI pattern); the UAC prompt then never appears for in-session
  privileged actions.
- Pre-disable UAC in the CI VM image (`EnableLUA=0` in the registry - locks the VM to test use only).
- Send `Alt+Y` / `Alt+N` keystrokes hoping the secure desktop has
  focus (unreliable and version-dependent; not recommended).

### macOS TCC privacy prompts

Per [Jamf - *Resetting Transparency, Consent, and Control Prompts
on macOS*][jamftcc]:

[jamftcc]: https://docs.jamf.com/technical-articles/Resetting_Transparency_Consent_and_Control_Prompts_on_macOS.html

TCC-gated prompts (Automation, Accessibility, Screen Recording,
Files & Folders) render out of the AUT process and cannot be
reliably driven by XCUITest. The supported pattern is to bring the
prompt back to a known state before the test:

```bash
tccutil reset Automation com.example.MyApp
tccutil reset Accessibility com.example.MyApp
tccutil reset ScreenCapture com.example.MyApp
```

Or, on managed CI fleets, pre-grant via an MDM PPPC (Privacy
Preferences Policy Control) profile so the prompt never appears.

### Linux: AT-SPI requires session-wide accessibility on

Per [dogtail on GitLab][dogtail] and the [Ubuntu DogtailTutorial][ubuntudogtail]:

[dogtail]: https://gitlab.com/dogtail/dogtail
[ubuntudogtail]: https://wiki.ubuntu.com/Testing/Automation/DogtailTutorial

On modern GNOME (X11 or Wayland), AT-SPI is off by default. Enable
it session-wide **before** launching the AUT:

```bash
gsettings set org.gnome.desktop.interface toolkit-accessibility true
```

This only takes effect for newly-spawned processes - start the AUT
after the gsettings call, not before. Accerciser is the GNOME
inspector and the canonical pre-write verification tool: walk the
tree in Accerciser before writing the first locator.

## High-DPI / per-monitor test matrix

Per [Microsoft - *High DPI Desktop Application Development on
Windows*][msdpi]:

[msdpi]: https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows

> "Common scenarios where display scale factors change include:
> multiple-monitor setups where each display has a different
> scale factor..."

Microsoft enumerates concrete test scenarios that desktop apps
must cover and that test matrices routinely miss:

| Scenario | What can break |
|---|---|
| Multi-display with different scale factors | Window placement, image asset selection (1x vs 2x), font hinting |
| Dock / undock with mixed DPI | Live scale-factor change events; window jumps to wrong monitor |
| Remote Desktop from high-DPI client to low-DPI host | Mouse hit-test coordinates, font rendering, accessibility-tree positions |
| Live scale-factor change (drag between monitors) | Per-monitor V2 awareness needed; otherwise app is bitmap-stretched |

The recommended awareness level for the AUT is **per-monitor V2**.
CI matrix: at minimum one mixed-DPI lane (2-monitor: 100% + 200%)
in addition to a single-monitor 100% lane. macOS Retina has
analogous behaviour (1x vs 2x asset selection); Linux per-monitor
scaling lands in GNOME 47+ but is still maturing.
