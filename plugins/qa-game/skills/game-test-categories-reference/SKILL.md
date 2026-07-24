---
name: game-test-categories-reference
description: "Pure-reference catalog of the testing categories that apply to a video-game build before it ships. Defines the six canonical buckets the industry tests against - functional / compliance / compatibility / performance / localization / accessibility - plus the multiplayer and content-rating sub-axes. Cross-references each bucket to the platform-holder vocabulary that drives it (Microsoft Xbox Requirements / XR test cases, Sony TRC, Nintendo Lotcheck, Steam Direct review). Use as the taxonomy lookup when planning a game test pass, scoping QA effort, mapping platform-cert findings back to internal test categories, preparing a submission checklist, reviewing first-party certification requirements, or triaging cert testing failures against internal categories."
metadata:
  keywords: "game-testing, functional-test, compliance-test, compatibility-test, performance-test, localization, accessibility, xag, xr, lotcheck, trc"
---

# game-test-categories-reference

## Overview

A video-game build is tested against six canonical categories that the industry has converged on over three console generations. This skill is the **pure-reference taxonomy** consumed by the engine-specific skills (`unity-test-framework`, `unreal-automation-system`, `godot-gut-tests`), the builders (`multiplayer-state-machine-coverage`, `gameplay-recording-replay`), and the platform submission reference (`platform-cert-overview-reference`).

Sources: Microsoft's [Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide), [Xbox Accessibility Guidelines (XAG) v3.2](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines), Steam's [App Review Process](https://partner.steamgames.com/doc/store/review_process), and longstanding QA practice (Schultz & Bryant, *Game Testing All-In-One*, 3rd ed., ISBN 9781305077133).

## The six canonical categories

| # | Category | Scope | Typical owner |
|---|---|---|---|
| 1 | **Functional** | Mechanics, scripting, AI, UI flow, save/load, economy/progression match the design spec. | Engine-specific automation + manual QA |
| 2 | **Compliance** | Build conforms to platform holder's Requirements / TRC / Lotcheck document. | Cert / submission QA |
| 3 | **Compatibility** | Runs across all required SKUs, OS versions, hardware generations, and display/audio/storage configurations. | Lab / device-cloud QA |
| 4 | **Performance** | Hits declared frame-time, load-time, memory, thermal, and battery budgets on each target SKU. | Performance engineers + profilers |
| 5 | **Localization** | Translated strings fit their UI, render in their script, and behave under RTL + CJK + length expansion; VO coverage correct. | LQA agencies + automation |
| 6 | **Accessibility** | Meets platform-required or -recommended accessibility guidelines (Microsoft XAG, AbleGamers, CVAA/EAA where applicable). | Accessibility QA + design |

These six categories are referenced throughout `platform-cert-overview-reference` when describing each platform's submission gates.

## Category detail

### 1. Functional

**Platform-specific notes.** Microsoft's [Build Verification Testing (BVT)](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide) stage is largely functional: "BVTs is a reduced test pass designed to make sure a product is fully testable and configured properly before entering full certification testing." Functional bugs that break BVT block the entire cert pass.

**Tooling.** Engine-native test frameworks (`unity-test-framework`, `unreal-automation-system`, `godot-gut-tests`) for unit + play-mode tests; recorded-input replay (per `gameplay-recording-replay`) for scripted scenario coverage.

### 2. Compliance

**Requirement documents by platform:**

| Platform | Document name | Source |
|---|---|---|
| Xbox console | Xbox Requirements (XRs) | [learn.microsoft.com/.../console/certification-requirements](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Xbox PC | Xbox Network Policies for PC and Mobile | [learn.microsoft.com/.../pc/live-policies-pc](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc) |
| PlayStation | Technical Requirements Checklist (TRC) | Gated NDA portal; cite by stable ID "Sony TRC" per `PLUGIN_AUTHORING.md` Step 4 fallback |
| Nintendo | Lotcheck / Submission Guidelines | Gated NDA portal; cite by stable ID "Nintendo Lotcheck" per Step 4 fallback |
| Steam | App Review Process | [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process) |

Each requirement maps to test cases with explicit Test Steps, Expected Behavior, and Pass/Fail examples - see Microsoft's [Certification Tested Xbox Requirements for Xbox Console Games](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/console-certification-requirements-and-tests).

**Severity model (Xbox; broadly applicable):**

| Code | Name | Effect |
|---|---|---|
| **CFR** | Condition for Resubmission | Title fails cert; must be fixed before resubmit |
| **SRI** | Standard Reporting Issue | Related to an XR but not severe enough to fail; fix recommended |
| **ION** | Issue of Note | Not tied to an XR; informational |
| **Non-Tested** | - | XR could not be tested in this pass |

Sony TRC and Nintendo Lotcheck use comparable severity tiers internally (NDA - cite by stable ID).

### 3. Compatibility

**The Xbox bench layout** - per the [Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide) - exemplifies the required matrix:

| Console | SKU | Resolution | Storage | Audio |
|---|---|---|---|---|
| Console 1 | Xbox One / Xbox Series X | 720p | Internal HDD | Stereo |
| Console 2 | Xbox One X / Xbox Series S | 4k | Internal HDD | 5.1 Bitstream |
| Console 3 | Xbox One S / Xbox Series X | 1080p | Internal HDD | Stereo |
| Console 4 | Xbox Series S | 1080p | USB HDD | Headset (Windows Sonic) |
| Console 5 | Xbox Series X | 720p | USB HDD | Stereo |

The same matrix logic applies to Sony (PS4 base / PS4 Pro / PS5 / PS5 Pro), Nintendo (Switch original / OLED / Switch 2), and PC (GPU vendor × driver version × OS × DirectX/Vulkan). Microsoft tracks cross-generation requirements under [XR-130: Xbox Console Families and Generations](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/xr/xr130).

### 4. Performance

**Key budgets:** frame-time targets (16.67 ms / 60 Hz, 33.33 ms / 30 Hz) under representative load; long-session memory stability ("soak" test).

**Where it shows up in cert.** Microsoft requires a minimum sustained framerate per [Xbox Requirements (XR) testing](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide). Sony TRC includes performance gates (NDA - cite by stable ID). Nintendo Lotcheck includes thermal + battery rules for Switch (NDA - cite by stable ID).

### 5. Localization

**Platform-specific note.** Microsoft's bench layout (table above) explicitly varies **Console Language** across five consoles to exercise localized assets in the cert pass. Culture-sensitive content rules live under each platform holder's compliance category - see Microsoft's [Xbox Network Policies](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc).

Key runtime risk areas not caught by screenshot review: German string overflow (~30% longer than English on average), CJK subpixel rendering, Arabic/Hebrew bidirectional layout, missing VO takes, and lip-sync drift.

### 6. Accessibility

**Guidelines source.** Microsoft XAG v3.2 at [learn.microsoft.com/.../accessibility/guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines). Each XAG entry specifies: Goal, Scoping questions, Key areas to target, Implementation guidelines, Example content, Potential player impact, and Resources/tools.

**Regulatory frameworks.** US CVAA applies to in-game communications; EU EAA applies from June 2025.

**Testing service.** Microsoft offers the [Microsoft Gaming Accessibility Testing Service (MGATS)](https://learn.microsoft.com/en-us/gaming/accessibility/mgats) that tests against the XAG.

Common sub-axes: remappable controls, hold-to-press toggle, Xbox Adaptive Controller support (Input); high-contrast modes, text size (XAG 101), color-blind modes, screen reader output (Visual); subtitles with font size / background opacity / speaker attribution (Audio); difficulty options, save-anywhere, reduced-motion toggles (Cognitive).

## Triage workflow

Given a bug report, apply this sequence:

1. **Identify symptom** - what broke? (crash, visual artifact, wrong value, missing asset, regulatory flag)
2. **Map to category** - use the bug-severity cheatsheet below; when in doubt, ask: "Is this a design-spec deviation (Functional), a platform-rule violation (Compliance), a hardware-variation failure (Compatibility), a budget overshoot (Performance), a locale-specific failure (Localization), or a barrier to play (Accessibility)?"
3. **Assign owner** - use the "Typical owner" column from the six-category table above.
4. **Set severity** - reference the platform holder's severity model (CFR / SRI / ION for Xbox; equivalent tiers for Sony and Nintendo). A CFR blocks resubmission; triage these first.
5. **Link to cert requirement** - record the XR / TRC / Lotcheck ID in the bug tracker field so cert QA can verify the fix closes the finding.

## Bug severity → category mapping cheatsheet

| Symptom | Category | Severity hint |
|---|---|---|
| Crash on save load | Functional | High - cert-blocker |
| XR-024 fail (unhandled controller disconnect) | Compliance | CFR - cert-blocker |
| Black screen on PS4 base, fine on PS5 | Compatibility | High - gens-affecting |
| 22 fps in raid encounter (target 30) | Performance | Triage vs. budget |
| German "Zurück" overflows button | Localization | Sev 3 - UI |
| Subtitles missing in cutscene 7 | Accessibility | XAG fail |
| Host migration drops players | Multiplayer (functional + compliance) | High |

## Cross-axis: multiplayer / online

Multiplayer is **not a seventh category** - it cuts across functional + compliance + compatibility + performance. Key test surface:

- **State-machine correctness** under packet loss / latency / disconnect - see `multiplayer-state-machine-coverage`.
- **Matchmaking + session lifecycle** - joins, drop-ins, host migration.
- **Anti-cheat compatibility** with platform integrity systems (Xbox LIVE; Sony's authentication; Nintendo Network).
- **Cert-blocking risk.** Per Microsoft's [certification-guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide), "Multiplayer does not work as expected" is one of the most common reasons a title is placed on **Hold** during an Xbox cert pass.

## Cross-axis: content rating

Content rating (ESRB / PEGI / CERO / USK / IARC) is a regulatory classification, not a testing category. However:

- Steam requires the [Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) before review.
- Platform holders gate distribution on the local rating board's certificate (cite by stable ID for NDA-only details).
- Localization (category 5) may interact with content rating - removing or recoloring blood for the German release, removing gambling minigames for the Belgian release.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating "QA" as one undifferentiated bucket | Loses ownership; compliance gaps surface at cert | Use the six categories explicitly in test plans + bug-tracker fields |
| Running compliance late ("we'll do cert later") | Late-found CFRs delay release by weeks | Run platform-holder TRC / XR checklists from milestone 1 |
| Compatibility on the dev kit only | Retail SKUs (Series S, PS4 base, Switch handheld) behave differently | Lab test on retail hardware per the bench layout above |
| Performance averaged over the level | Spikes cause CFRs; averages hide them | Frame-time histograms, p99, sustained-window measurements |
| Localization screenshot review | Misses runtime overflow, missing VO, lip-sync drift | Playthrough every locale; not a glanced screenshot |
| Accessibility as a launch checklist | Architectural changes (rebindable input) can't be retrofitted | XAG scoping questions at design milestone, not at submission |
| Multiplayer tested only in low-latency LAN | Drops, NAT, host migration fail in the wild | Inject loss / jitter; see `multiplayer-state-machine-coverage` |

## Limitations

- **NDA-only platform details.** Sony TRC and Nintendo Lotcheck exact requirement numbers are gated. This skill cites them by stable ID per `PLUGIN_AUTHORING.md` Step 4 fallback; partners with NDA access should consult their developer portal for the authoritative current revision.
- **Microsoft XR numbering drifts.** XR identifiers (XR-024, XR-130, etc.) are revised across GDK releases - verify against the [current Xbox Requirements list](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) before quoting.
- **Steam Direct is lighter than console cert.** Per [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process), Steam's review is store-page + build-startup focused (3 - 5 business days), not a console-style XR pass.
- **Content rating boards are out of scope** - they are regulatory classification, not QA categories. Consult ESRB / PEGI / CERO / USK / IARC documentation directly.
- **No regional content rules here.** Per-region content rules (German violence colouring, Belgian / NL loot-box rules, China / Korea content rules) are platform + region specific - consult the platform holder's regional supplement.
