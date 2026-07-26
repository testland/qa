# Compatibility budget - tier definitions and example budgets

Detailed reference for `compatibility-budget`. The tier model below defines the four commitment levels; the per-product-type tables are starting templates to copy and adjust against your own telemetry.

## Tier model

| Tier         | Definition                                          | CI cadence       |
|--------------|-----------------------------------------------------|------------------|
| **Tier 1**    | Must work; failure blocks releases.                 | Per-PR smoke.    |
| **Tier 2**    | Must work; failure blocks releases on detection.    | Nightly full suite. |
| **Tier 3**    | Should work; broken-here is a known issue.          | Pre-release manual / weekly. |
| **Unsupported** | Explicitly out of scope; bugs closed as "not supported." | None.    |

The tier signals **engineering investment**, not user importance - a configuration with low traffic but contractual obligation may be Tier 1.

## Example budget per product type

### Modern web app

| Configuration                | Tier   |
|------------------------------|--------|
| Chrome (current + 1 prior)    | 1     |
| Edge (current)                | 1     |
| Safari (current + 1 prior)    | 1     |
| Firefox (current)              | 2     |
| iOS Safari (current + 1 prior) | 1     |
| Chrome on Android (current)   | 1     |
| Firefox Android               | 3     |
| Samsung Internet              | 3     |
| Internet Explorer              | unsupported |
| < Chrome 100                   | unsupported |

### Internal SaaS (controlled audience)

| Configuration                  | Tier   |
|--------------------------------|--------|
| Chrome (latest stable)          | 1     |
| Chrome (current - 1 stable)     | 1     |
| Edge (latest)                   | 2     |
| Firefox                          | 3     |
| Safari                          | 3     |
| All others                      | unsupported |

### Open-source library

| Configuration                                       | Tier   |
|-----------------------------------------------------|--------|
| Node 18, 20, 22 on Linux                             | 1     |
| Node 18, 20, 22 on macOS                             | 2     |
| Node 18, 20, 22 on Windows                           | 2     |
| Bun (current)                                         | 3     |
| Deno (current)                                        | 3     |
| Older Node EOL versions                              | unsupported |

### Mobile native app

| Configuration                          | Tier   |
|----------------------------------------|--------|
| iOS 17, 16 (current + 1 prior)          | 1     |
| iOS 15                                  | 2     |
| iOS 14                                   | 3     |
| < iOS 14                                | unsupported |
| Android 14, 13                           | 1     |
| Android 12                               | 2     |
| Android 11                                | 3     |
| < Android 11                             | unsupported |
