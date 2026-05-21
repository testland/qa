---
name: game-test-categories-reference
description: "Pure-reference catalog of the testing categories that apply to a video-game build before it ships. Defines the six canonical buckets the industry tests against — functional / compliance / compatibility / performance / localization / accessibility — plus the multiplayer and content-rating sub-axes. Cross-references each bucket to the platform-holder vocabulary that drives it (Microsoft Xbox Requirements / XR test cases, Sony TRC, Nintendo Lotcheck, Steam Direct review). Use as the taxonomy lookup when planning a game test pass, scoping QA effort, or mapping platform-cert findings back to internal test categories. Pairs with platform-cert-overview-reference for the platform-by-platform submission process."
rating: 24
d6: 4
archetype: S2
keywords: ["game-testing", "functional-test", "compliance-test", "compatibility-test", "performance-test", "localization", "accessibility", "xag", "xr", "lotcheck", "trc"]
---

# game-test-categories-reference

## Overview

A video-game build is tested against a stable set of categories
that the industry has converged on over three console generations.
Public sources — Microsoft's
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
Microsoft's
[Xbox Accessibility Guidelines (XAG) v3.2](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines),
and Steam's
[App Review Process](https://partner.steamgames.com/doc/store/review_process)
— and longstanding QA practice in the field (Schultz & Bryant,
*Game Testing All-In-One*, 3rd ed., ISBN 9781305077133, cited by
stable ID per `PLUGIN_AUTHORING.md` Step 4 fallback; GDC Vault
talks on test taxonomy, gated, cited by stable ID) name the same
six buckets with minor wording differences.

This skill is the **pure-reference taxonomy** consumed by:

- the engine-specific S1 skills
  ([`unity-test-framework`](../unity-test-framework/SKILL.md),
  [`unreal-automation-system`](../unreal-automation-system/SKILL.md),
  [`godot-gut-tests`](../godot-gut-tests/SKILL.md)),
- the S3 builders
  ([`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md),
  [`gameplay-recording-replay-skill`](../gameplay-recording-replay-skill/SKILL.md)),
- and the platform submission reference
  ([`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)),
  which maps each category onto the four platform holders.

## When to use

- Scoping QA effort for a new title — what categories must be
  covered before submission?
- Mapping a failed platform-cert finding back to an internal test
  category (e.g., "XR-130 fail" → `compatibility-test`).
- Planning a test-pass cadence (functional every PR, compliance +
  performance pre-submission, accessibility per milestone).
- Triaging a bug — which category does it belong to, who owns the
  fix?

## The six canonical categories

| # | Category | Scope | Typical owner |
|---|---|---|---|
| 1 | **Functional** | Does the game do what its design says? Mechanics, scripting, AI, UI flow, save/load. | Engine-specific automation + manual QA |
| 2 | **Compliance** | Does the build meet the platform holder's *Requirements* document (Xbox XRs, Sony TRC, Nintendo Lotcheck, Steam Direct review)? | Cert / submission QA |
| 3 | **Compatibility** | Does it run across all required SKUs / OSes / hardware generations (Xbox One vs. Series S vs. Series X; PS4 vs. PS5; Switch vs. Switch 2; PC GPU/driver matrix)? | Lab / device-cloud QA |
| 4 | **Performance** | Does it hit the title's frame-time, load-time, memory, thermal, and battery budgets on each target SKU? | Performance engineers + profilers |
| 5 | **Localization** | Does every translated string fit its UI, render in its script, and behave under right-to-left + CJK + length expansion? Voice-over coverage. | LQA agencies + automation |
| 6 | **Accessibility** | Does the title meet the accessibility guidelines the platform requires or recommends (Microsoft XAG, AbleGamers, CVAA where applicable)? | Accessibility QA + design |

These six categories are referenced throughout
[`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
when describing each platform's submission gates.

## Category detail

### 1. Functional

**Definition.** Verifies that gameplay mechanics, AI, scripting,
UI, save/load, networking, and economy match the design
specification.

**Sub-axes:**

- **Mechanics correctness** — physics, hit detection, damage
  formulas, win/lose conditions.
- **AI behaviour** — pathfinding, decision trees / utility AI,
  difficulty curves.
- **UI flow** — every menu transition, every controller-disconnect
  recovery prompt, every "Press Any Button" front-end.
- **Save / load** — round-trip integrity, cross-platform saves,
  cloud sync conflicts, corrupted-save recovery.
- **Economy / progression** — XP curves, currency sinks, unlock
  triggers, anti-grief.

**Typical tooling.** Engine-native test framework
([`unity-test-framework`](../unity-test-framework/SKILL.md),
[`unreal-automation-system`](../unreal-automation-system/SKILL.md),
[`godot-gut-tests`](../godot-gut-tests/SKILL.md)) for unit + play-mode
tests; recorded-input replay (per
[`gameplay-recording-replay-skill`](../gameplay-recording-replay-skill/SKILL.md))
for scripted scenario coverage.

**Where it shows up in cert.** Microsoft's
[Build Verification Testing (BVT)](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
stage is largely functional: "BVTs is a reduced test pass designed
to make sure a product is fully testable and configured properly
before entering full certification testing." Functional bugs that
break BVT block the entire cert pass.

### 2. Compliance

**Definition.** Verifies the build conforms to the platform
holder's published Requirements / Policies / TRC document. Each
platform holder maintains its own:

| Platform | Document name | Source |
|---|---|---|
| Xbox console | Xbox Requirements (XRs) | [learn.microsoft.com/.../console/certification-requirements](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Xbox PC | Xbox Network Policies for PC and Mobile | [learn.microsoft.com/.../pc/live-policies-pc](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc) |
| PlayStation | Technical Requirements Checklist (TRC) | Gated NDA portal; cite by stable ID "Sony TRC" per `PLUGIN_AUTHORING.md` Step 4 fallback |
| Nintendo | Lotcheck / Submission Guidelines | Gated NDA portal; cite by stable ID "Nintendo Lotcheck" per Step 4 fallback |
| Steam | App Review Process | [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process) |

Each requirement maps to one or more **test cases** with explicit
Test Steps, Expected Behavior, and Pass / Fail examples — see
Microsoft's
[Certification Tested Xbox Requirements for Xbox Console Games](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/console-certification-requirements-and-tests).

**Severity model (Xbox example, applies broadly).** Per the
Microsoft cert guide above, findings are classified as:

| Code | Name | Effect |
|---|---|---|
| **CFR** | Condition for Resubmission | Title fails cert; must be fixed before resubmit |
| **SRI** | Standard Reporting Issue | Related to an XR but not severe enough to fail; fix recommended |
| **ION** | Issue of Note | Not tied to an XR; informational |
| **Non-Tested** | — | XR could not be tested in this pass |

Sony TRC and Nintendo Lotcheck use comparable severity tiers
internally (NDA — cite by stable ID).

**See also.**
[`platform-cert-overview-reference`](../platform-cert-overview-reference/SKILL.md)
for the submission workflow per platform.

### 3. Compatibility

**Definition.** Verifies the build runs across the full matrix of
supported hardware generations, console SKUs, display modes, audio
configurations, storage devices, controller types, and accounts.

**The Xbox bench layout** — per the
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
— exemplifies the matrix:

| Console | SKU | Resolution | Storage | Audio |
|---|---|---|---|---|
| Console 1 | Xbox One / Xbox Series X | 720p | Internal HDD | Stereo |
| Console 2 | Xbox One X / Xbox Series S | 4k | Internal HDD | 5.1 Bitstream |
| Console 3 | Xbox One S / Xbox Series X | 1080p | Internal HDD | Stereo |
| Console 4 | Xbox Series S | 1080p | USB HDD | Headset (Windows Sonic) |
| Console 5 | Xbox Series X | 720p | USB HDD | Stereo |

(table from Microsoft's
[certification-guide § Certification test bench configuration](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide))

The same matrix logic applies to Sony (PS4 base / PS4 Pro / PS5 /
PS5 Pro), Nintendo (Switch original / OLED / Switch 2), and PC
(GPU vendor × driver version × OS × DirectX/Vulkan).

**Cross-generation specifically.** Microsoft tracks this under
[XR-130: Xbox Console Families and Generations](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/xr/xr130).

### 4. Performance

**Definition.** Verifies the title hits its declared frame-time,
load-time, memory, thermal, and (handheld) battery budgets on each
SKU in the compatibility matrix.

**Sub-axes:**

- **Frame-time** — target 16.67 ms (60 Hz) or 33.33 ms (30 Hz),
  measured under representative load (combat encounter, open-world
  traversal, cinematic).
- **Load time** — boot, level transition, fast travel.
- **Memory** — peak working-set, fragmentation under long sessions
  (a "soak" test in compliance vocabulary).
- **Thermal** — sustained-performance scaling on closed-chassis
  devices (Switch, Steam Deck, Series S in Energy Saving mode).
- **Battery** — handheld + portable (Switch, Steam Deck, mobile).

**Where it shows up in cert.** Microsoft requires a minimum
sustained framerate per
[Xbox Requirements (XR) testing](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide).
Sony TRC includes performance gates (NDA — cite by stable ID).
Nintendo Lotcheck includes thermal + battery rules for Switch
(NDA — cite by stable ID).

### 5. Localization

**Definition.** Verifies that translated text, voice-over, dates,
times, currencies, and culture-specific content render and behave
correctly per locale.

**Sub-axes:**

- **String fitting** — does the German translation overflow the UI
  control? (German averages ~30 % longer than English.)
- **Script support** — CJK rendering (subpixel hinting, vertical
  text where used), Arabic / Hebrew bidirectional layout.
- **Voice-over coverage** — does every English VO line have a
  matching localized take? Lip-sync drift.
- **Culture-sensitive content** — flags, gestures, gambling
  references, religious symbols. (Each platform holder maintains
  per-region content rules under its compliance category — see
  Microsoft's
  [Xbox Network Policies](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc).)
- **Date / time / currency formatting** — locale-aware
  presentation.

**Where it shows up in cert.** Microsoft's bench layout (table
above) explicitly varies **Console Language** across five consoles
to exercise localized assets in the cert pass.

### 6. Accessibility

**Definition.** Verifies the title meets the accessibility
guidelines published by the platform holder (Microsoft XAG v3.2
per [learn.microsoft.com/.../accessibility/guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines))
and the regulatory framework that applies in the target market
(US CVAA for in-game communications; EU EAA from June 2025).

**XAG-style category structure.** Each Xbox Accessibility
Guideline, per the page above, has:

- **Goal** — desired player impact.
- **Scoping questions** — does this XAG apply to your title?
- **Key areas to target** — game elements the XAG covers.
- **Implementation guidelines** — prescriptive minimum bar.
- **Example content** — images / video of good implementation.
- **Potential player impact** — disability types affected.
- **Resources and tools.**

**Common accessibility test sub-axes** (cross-referenced to XAG
identifiers where they exist; see
[learn.microsoft.com/.../accessibility/guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)):

- **Input** — remappable controls, hold-to-press toggle, single-stick
  control schemes, Xbox Adaptive Controller support.
- **Visual** — high-contrast modes, text size, color-blind modes,
  screen reader / narrator output for menus (XAG 101 text size,
  cited in the guidelines overview above).
- **Audio** — subtitles (font size, background opacity, speaker
  attribution), visual cues for audio events.
- **Cognitive** — difficulty options, save-anywhere, pause-anywhere,
  reduced motion / camera-shake toggles.

**Service.** Microsoft offers an explicit
[Microsoft Gaming Accessibility Testing Service (MGATS)](https://learn.microsoft.com/en-us/gaming/accessibility/mgats)
that tests against the XAG.

## Cross-axis: multiplayer / online

Multiplayer is **not a seventh category** — it cuts across
functional + compliance + compatibility + performance. The
multiplayer-specific test surface is:

- **State-machine correctness** under packet loss / latency /
  disconnect — see
  [`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md).
- **Matchmaking + session lifecycle** — joins, drop-ins, host
  migration.
- **Anti-cheat compatibility** with platform integrity systems
  (Xbox LIVE; Sony's authentication; Nintendo Network).
- **Cert-blocking risk.** Per Microsoft's
  [certification-guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
  "Multiplayer does not work as expected" is one of the most common
  reasons a title is placed on **Hold** during a Xbox cert pass.

## Cross-axis: content rating

Content rating (ESRB / PEGI / CERO / USK / IARC) is **not a
testing category** — it is a regulatory classification authored
from a content questionnaire, then validated by the rating board.
However:

- Steam requires the
  [Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)
  before review.
- Platform holders gate distribution on the local rating board's
  certificate (cite by stable ID for the NDA-only details).
- Localization (category 5) may interact with content rating —
  removing or recoloring blood for the German release, removing
  gambling minigames for the Belgian release.

## Bug severity → category mapping cheatsheet

When triaging a bug, map it to one category to clarify owner +
urgency:

| Symptom | Category | Severity hint |
|---|---|---|
| Crash on save load | Functional | High — cert-blocker |
| XR-024 fail (unhandled controller disconnect) | Compliance | CFR — cert-blocker |
| Black screen on PS4 base, fine on PS5 | Compatibility | High — gens-affecting |
| 22 fps in raid encounter (target 30) | Performance | Triage vs. budget |
| German "Zurück" overflows button | Localization | Sev 3 — UI |
| Subtitles missing in cutscene 7 | Accessibility | XAG fail |
| Host migration drops players | Multiplayer (functional + compliance) | High |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating "QA" as one undifferentiated bucket | Loses ownership; compliance gaps surface at cert | Use the six categories explicitly in test plans + bug-tracker fields |
| Running compliance late ("we'll do cert later") | Late-found CFRs delay release by weeks | Run platform-holder TRC / XR checklists from milestone 1 |
| Compatibility on the dev kit only | Retail SKUs (Series S, PS4 base, Switch handheld) behave differently | Lab test on retail hardware per the bench layout above |
| Performance averaged over the level | Spikes cause CFRs; averages hide them | Frame-time histograms, p99, sustained-window measurements |
| Localization screenshot review | Misses runtime overflow, missing VO, lip-sync drift | Playthrough every locale; not a glanced screenshot |
| Accessibility as a launch checklist | Architectural changes (rebindable input) can't be retrofitted | XAG scoping questions at design milestone, not at submission |
| Multiplayer tested only in low-latency LAN | Drops, NAT, host migration fail in the wild | Inject loss / jitter; see [`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md) |

## Limitations

- **NDA-only platform details.** Sony TRC and Nintendo Lotcheck
  exact requirement numbers are gated. This skill cites them by
  stable ID per `PLUGIN_AUTHORING.md` Step 4 fallback; partners
  with NDA access should consult their developer portal for the
  authoritative current revision.
- **Microsoft XR numbering drifts.** XR identifiers (XR-024,
  XR-130, etc.) are revised across GDK releases — verify against
  the
  [current Xbox Requirements list](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  before quoting.
- **Steam Direct is lighter than console cert.** Per
  [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process),
  Steam's review is store-page + build-startup focused (3–5
  business days), not a console-style XR pass.
- **Content rating boards are out of scope** of this skill — they
  are regulatory classification, not QA categories. Consult ESRB /
  PEGI / CERO / USK / IARC documentation directly.
- **No regional rating list here.** Per-region content rules
  (German violence colouring, Belgian / NL loot-box rules, China /
  Korea content rules) are platform + region specific — consult
  the platform holder's regional supplement.
