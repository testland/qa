# Per-platform PWA install paths

Deep reference for `pwa-install-flow-reference` SKILL.md (Stage 3). Consult
when a test must branch across Chromium desktop, Android Chrome, iOS / iPadOS
Safari, desktop Safari, or Firefox, or when asserting WebAPK / Share-menu
install behavior.

## Per-platform install path

The install path itself diverges by platform. Tests must branch:

| Platform | Path | Trigger | Test posture |
|---|---|---|---|
| Chromium desktop (Chrome, Edge, Brave) | Install badge in URL bar; "Install" item in overflow menu | `beforeinstallprompt` fires when Stage 1 passes | Drive `prompt()` from a user-gesture click; assert `userChoice.outcome` and `appinstalled` |
| Android Chrome | WebAPK minting (a real APK signed by Google Play services and registered with the launcher) per [learn-pwa] | `beforeinstallprompt` fires; user accepts via mini-infobar or app-driven prompt | Smoke on a real device farm; Playwright on Android Chrome works for the prompt itself but cannot assert WebAPK minting completion |
| Android Chrome (alternate) | Shortcuts or QuickApp formats per [learn-pwa] | Same as WebAPK path | WebAPK is the canonical path; shortcut path is a fallback |
| iOS / iPadOS Safari | "Open the Share menu... Click Add to Home Screen... Confirm the name of the app... Click Add" per [learn-pwa] | Manual user gesture only; no `beforeinstallprompt` event | Test the metadata (`apple-touch-icon`, `apple-mobile-web-app-capable` meta) statically; assert installed runtime via `display-mode` MQ (Stage 4); the actual install step is manual smoke |
| Desktop Safari | App-driven install on macOS Sonoma+ via the "Add to Dock" Share menu | Manual user gesture only | Same posture as iOS - static metadata + post-install MQ |
| Firefox desktop | Install UI not exposed | n/a | No `beforeinstallprompt`; no install assertion path |

Per [learn-pwa]: iOS install "requires `apple-touch-icon` tag" - a
test that omits this assertion misses a class of icon-missing
install regressions that are otherwise invisible until a user
files a bug.

## Per-platform testing caveats

- **WebAPK minting completion is opaque.** Per [learn-pwa] Android
  Chrome mints a WebAPK on install, but the test surface ends at
  `appinstalled` - the minting is a background-service-worker
  operation, not a DOM-observable event.
- **iOS Safari has no programmatic install API.** Stage 3 iOS
  cells must be tested with manual smoke or device-farm Appium
  drivers; no headless path exists.

[learn-pwa]: https://web.dev/learn/pwa/installation
