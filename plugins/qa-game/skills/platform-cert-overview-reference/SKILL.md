---
name: platform-cert-overview-reference
description: "Reference catalog of game-QA test categories and the four platform-holder certification regimes a multi-platform title submits to before release. Defines the six canonical test categories (functional / compliance / compatibility / performance / localization / accessibility) plus the multiplayer and content-rating cross-axes; documents the submission workflow, severity vocabulary, test-bench configurations, and known SLAs for Microsoft Xbox Requirements (XR), Sony TRC (gated PlayStation DevNet), Nintendo Lotcheck (gated Nintendo Developer Portal), and Steam Direct review; and includes the building-a-cert-checklist workflow that maps a target platform's requirement items to the six categories. Cites public sources inline; cites gated NDA portals by stable ID per PLUGIN_AUTHORING.md Step 4 fallback. Use when planning a game test pass or cert calendar, mapping internal QA findings to the platform's vocabulary, sequencing submissions across platforms, or emitting a pre-submission checklist."
metadata:
  keywords: "xbox-cert, xr, playstation-trc, nintendo-lotcheck, steam-direct, submission, certification, release"
---

# platform-cert-overview-reference

## Overview

A multi-platform title that ships on console plus PC submits to **four distinct
certification regimes**, each with its own requirements document, severity
vocabulary, test-bench configuration, and SLA. This skill is the **pure
reference** that maps those four regimes onto a common structure so QA leads
can plan a cert calendar without re-learning each portal.

| Platform | Regime | Document name | Source |
|---|---|---|---|
| Xbox | Xbox Certification | Xbox Requirements (XR) | [learn.microsoft.com](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) (public) |
| PlayStation | Sony TRC | Technical Requirements Checklist | PlayStation DevNet (gated) |
| Nintendo | Lotcheck | Submission Guidelines | Nintendo Developer Portal (gated) |
| Steam | Steam Direct | App Review Process | [partner.steamgames.com](https://partner.steamgames.com/doc/store/review_process) (public) |

**NDA note.** Sony TRC and Nintendo Lotcheck live behind gated portals; their
exact clause numbers, SLAs, severity vocabulary, and bench matrices are cited
by stable ID ("Sony TRC" / "Nintendo Lotcheck") per `PLUGIN_AUTHORING.md`
Step 4 fallback. Xbox and Steam requirements are public and cited inline.

The six canonical test categories (functional / compliance / compatibility /
performance / localization / accessibility) that map across all four regimes
are defined in "The six test categories" below.

## When to use

- Planning a game test pass - which of the six categories apply,
  who owns each, and how a bug maps to a category.
- Planning a cert calendar - when to submit, expected SLA, how
  many parallel passes to budget.
- Mapping a CFR / hold / fail back to internal QA categories.
- Sequencing submissions across platforms - which platform tends
  to surface which class of issue first.
- Emitting a per-platform pre-submission checklist (see "Building a
  cert checklist" below).
- Onboarding a new team member to the cert vocabulary without
  full NDA-portal access on day 1.

## The six test categories

A game build is tested against six canonical categories the industry has
converged on over three console generations (sources: Microsoft's
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
[Xbox Accessibility Guidelines (XAG) v3.2](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines),
Steam's [App Review Process](https://partner.steamgames.com/doc/store/review_process),
and Schultz & Bryant, *Game Testing All-In-One*, 3rd ed., ISBN 9781305077133):

| # | Category | Scope | Typical owner |
|---|---|---|---|
| 1 | **Functional** | Mechanics, scripting, AI, UI flow, save/load, economy/progression match the design spec. | Engine-specific automation + manual QA |
| 2 | **Compliance** | Build conforms to platform holder's Requirements / TRC / Lotcheck document. | Cert / submission QA |
| 3 | **Compatibility** | Runs across all required SKUs, OS versions, hardware generations, and display/audio/storage configurations. | Lab / device-cloud QA |
| 4 | **Performance** | Hits declared frame-time, load-time, memory, thermal, and battery budgets on each target SKU. | Performance engineers + profilers |
| 5 | **Localization** | Translated strings fit their UI, render in their script, and behave under RTL + CJK + length expansion; VO coverage correct. | LQA agencies + automation |
| 6 | **Accessibility** | Meets platform-required or -recommended accessibility guidelines (Microsoft XAG, AbleGamers, CVAA/EAA where applicable). | Accessibility QA + design |

Category notes:

- **Functional.** Microsoft's [Build Verification Testing (BVT)](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
  stage is largely functional: "BVTs is a reduced test pass designed to make
  sure a product is fully testable and configured properly before entering
  full certification testing" - functional bugs that break BVT block the
  entire cert pass. Tooling: the engine skills (`unity-test-framework`,
  `unreal-automation-system`, `godot-gut-tests`) plus recorded-input replay
  (`gameplay-recording-replay`).
- **Compliance.** The per-platform requirement documents and the CFR / SRI /
  ION severity codes are in
  [references/platform-cert-details.md](references/platform-cert-details.md).
  A **CFR** (Condition for Resubmission) fails cert and must be fixed before
  resubmit.
- **Compatibility.** The Xbox 5-console bench layout that exemplifies the
  required matrix - plus the Sony / Nintendo / PC equivalents - is in
  [references/platform-cert-details.md](references/platform-cert-details.md).
- **Performance.** Frame-time targets (16.67 ms / 60 Hz, 33.33 ms / 30 Hz)
  under representative load; long-session memory stability ("soak" test).
  Microsoft requires a minimum sustained framerate per
  [XR testing](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide);
  Sony TRC performance gates and Nintendo thermal + battery rules are NDA
  (cite by stable ID).
- **Localization.** The cert bench varies **Console Language** across consoles
  to exercise localized assets. Runtime risks screenshot review misses:
  German string overflow (~30% longer than English on average), CJK subpixel
  rendering, Arabic/Hebrew bidirectional layout, missing VO takes, lip-sync
  drift.
- **Accessibility.** Microsoft XAG v3.2 entries each specify Goal / Scoping
  questions / Implementation guidelines; the
  [Microsoft Gaming Accessibility Testing Service (MGATS)](https://learn.microsoft.com/en-us/gaming/accessibility/mgats)
  tests against the XAG. Regulatory overlays: US CVAA (in-game
  communications), EU EAA from June 2025.

### Triage workflow

Given a bug report: identify the symptom → map to a category (cheatsheet
below) → assign the owner from the table → set severity in the platform
holder's vocabulary (CFR / SRI / ION for Xbox; comparable NDA tiers for Sony /
Nintendo - triage CFRs first) → record the XR / TRC / Lotcheck ID in the bug
tracker so cert QA can verify the fix → confirm the category and requirement
ID still resolve in the current requirements list before closing (a stale XR
number is the common triage error).

| Symptom | Category | Severity hint |
|---|---|---|
| Crash on save load | Functional | High - cert-blocker |
| XR-024 fail (unhandled controller disconnect) | Compliance | CFR - cert-blocker |
| Black screen on PS4 base, fine on PS5 | Compatibility | High - gens-affecting |
| 22 fps in raid encounter (target 30) | Performance | Triage vs. budget |
| German "Zurück" overflows button | Localization | Sev 3 - UI |
| Subtitles missing in cutscene 7 | Accessibility | XAG fail |
| Host migration drops players | Multiplayer (functional + compliance) | High |

### Cross-axes: multiplayer and content rating

**Multiplayer is not a seventh category** - it cuts across functional +
compliance + compatibility + performance: state-machine correctness under
packet loss / latency / disconnect (see `multiplayer-state-machine-coverage`),
matchmaking + session lifecycle, anti-cheat compatibility with platform
integrity systems. Per Microsoft's
[certification-guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
"Multiplayer does not work as expected" is one of the most common reasons a
title is placed on **Hold** during an Xbox cert pass.

**Content rating** (ESRB / PEGI / CERO / USK / IARC) is a regulatory
classification, not a testing category - but Steam requires the
[Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)
before review, platform holders gate distribution on the local rating board's
certificate, and localization may interact with rating (removing gambling
minigames for the Belgian release).

## Certification regimes

Per-regime detail lives in one reference file each:

- **Microsoft Xbox Certification** - public XR requirements, three-stage
  submission (Submission checks -> BVT -> XR testing), CFR / SRI / ION
  severity, the 5-console bench matrix, and SLAs (5 business days digital). See
  [references/xbox-certification.md](references/xbox-certification.md).
- **Sony PlayStation (TRC)** and **Nintendo Lotcheck** - the two NDA-gated
  console regimes: TRC / Lotcheck structure, submission workflow, severity, and
  the Switch handheld/docked + Joy-Con test surface unique to Nintendo. See
  [references/console-nda-regimes.md](references/console-nda-regimes.md).
- **Steam Direct** - the lightest regime: two parallel reviews (Store Presence
  + Product Build), 3-5 business days each (plan for 7); the bar is "starts up
  + features match store page + Steam Wallet for IAP". See
  [references/steam-direct.md](references/steam-direct.md).

## Versioning and deprecation

Time-sensitive version facts, isolated here so the body stays evergreen:

- The Xbox XR list ships per GDK release; **v16.1 (dated 5/01/2026)** is
  current at time of writing. Verify the version that applies to your GDK
  before quoting XR numbers.
- The XR
  [page header](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  lists `gdk-2510`, `gdk-2604`, and `gdk-2610` monikers.
- The May 2026 v16.1 release **retired XR-134** (Data Transfer Using Web
  Protocols) per the Changes in this Release table; XR identifiers churn
  release-to-release.
- Sony PS5 TRC supersedes PS4 TRC (PS5 Pro adds 60-Hz / 8K / Game Boost
  guidance); Nintendo Lotcheck tracks Switch hardware revisions and Switch 2.

## Cross-platform comparison summary

| Dimension | Xbox | Sony | Nintendo | Steam |
|---|---|---|---|---|
| Requirements doc | XR (versioned per GDK) | TRC (NDA) | Lotcheck (NDA) | App Review Process |
| Public visibility | Full | Gated | Gated | Full |
| Submission stages | 3 (val + BVT + XR) | Multi-step (NDA) | Multi-step (NDA) | 2 parallel (store + build) |
| Test-pass types | Optional + Final | (NDA) | (NDA) | One pass per submission |
| Severity vocab | CFR / SRI / ION | NDA (comparable) | NDA (comparable) | Pass / Fail (informal) |
| Console SLA (digital) | 5 BD | (NDA - practitioner-weeks) | (NDA - practitioner-weeks) | 3-5 BD (plan for 7) |
| Content-update SLA | 3 BD (1 BD bypass on PC) | (NDA) | (NDA) | Same as initial review |
| Bench matrix | 5 consoles × SKU / display / audio / power | PS4 / PS4 Pro / PS5 / PS5 Pro (NDA) | Switch / OLED / Lite / Switch 2 + handheld/docked (NDA) | Per-OS startup |
| Accessibility surface | XAG v3.2 (recommended; MGATS service available) | TRC clauses + Sony's accessibility guidance (NDA) | Lotcheck clauses (NDA) | Not gated |
| Achievements / Trophies surface | XR-055 / -057 / -058 / -060 / -062 | Trophies (NDA) | None native to Lotcheck | Steam Achievements (no cert gate) |

## Sequencing across platforms

A pattern that surfaces issues earliest:

1. **Xbox Optional Submission first.** Public requirements + paid
   pre-pass means partners get the most explicit feedback on the
   most-numerous XR list before sinking it into Sony / Nintendo
   submission slots.
2. **Sony TRC dry-run** (internal, against the partner's most
   recent TRC version). Patterns the team learned from Xbox port
   over.
3. **Nintendo Lotcheck** if the title supports Switch - handheld /
   docked + Joy-Con state surface is unique and needs its own
   pass.
4. **Steam Direct** can usually slot in late; the bar is the
   lowest.

This is a heuristic, not a mandate - partners with strong
in-house TRC expertise often reverse the Xbox / Sony ordering.

## Building a cert checklist

To turn a target platform into a ready-to-run pre-submission checklist,
follow this workflow (inputs: target platform - `xbox` / `playstation` /
`nintendo` / `steam` / `all`; optional milestone context, title-features
list, target hardware SKUs):

1. **Identify the gating document** from the regimes table above: Xbox XR
   v16.1 (public), Sony TRC (gated - stable ID "Sony TRC"), Nintendo Lotcheck
   (gated - stable ID "Nintendo Lotcheck"), Steam App Review Process
   (public). For `all`, emit one section per platform in that order.
2. **Filter by title features.** Mark items Not Applicable when a requirement
   only applies to a feature the title does not use (e.g., XR-064 Joinable
   via shell is N/A for a single-player-only title). Keep the row and mark it
   N/A with the reason - never silently omit, so reviewers can confirm the
   exclusion is intentional.
3. **Emit one checklist section per platform.** Header row: requirements-doc
   name + version, source URL or stable-ID cite, gated vs public, submission
   SLA from the comparison table above. Then a table with columns
   `# | Requirement | Description | Test Category | Pass Signal | N/A?` -
   the Test Category comes from the six-category taxonomy above; the Pass
   Signal names the observable outcome that counts as a pass. Public
   platforms get requirement IDs + inline URLs; gated platforms get bucket
   names + the stable-ID cite - never reproduce NDA clause text verbatim.
4. **Append sequencing advice** from "Sequencing across platforms" above,
   plus the platform's common cert blockers (e.g., Xbox's most common hold
   reasons - missing partner accounts, sandbox partner-service gaps,
   multiplayer failures - per the
   [certification guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)).

Refuse to emit a checklist item whose claim has no available source - surface
the gap instead of inventing text. Engine test scenario files are a different
job: the `game-test-scenario-author` agent authors those.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating cert as a Q4 milestone | Late-found CFRs delay launch by weeks | Run XR / TRC checklists from milestone 1 |
| Treating "QA" as one undifferentiated bucket | Loses ownership; compliance gaps surface at cert | Use the six categories explicitly in test plans + bug-tracker fields |
| Compatibility on the dev kit only | Retail SKUs (Series S, PS4 base, Switch handheld) behave differently | Lab test on retail hardware per the bench layout in [references/platform-cert-details.md](references/platform-cert-details.md) |
| Performance averaged over the level | Spikes cause CFRs; averages hide them | Frame-time histograms, p99, sustained-window measurements |
| Localization screenshot review | Misses runtime overflow, missing VO, lip-sync drift | Playthrough every locale; not a glanced screenshot |
| Accessibility as a launch checklist | Architectural changes (rebindable input) can't be retrofitted | XAG scoping questions at design milestone, not at submission |
| Multiplayer tested only in low-latency LAN | Drops, NAT, host migration fail in the wild | Inject loss / jitter; see `multiplayer-state-machine-coverage` |
| Optional submission "to find out where we are" without prep | Burns paid slot to find bugs internal QA could have | Run internal XR pre-pass before any paid Optional |
| Submitting before partner-service stubs are ready | Held titles cost real calendar days per Microsoft's [common hold reasons](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide) | Stand up CERT.DEBUG / CERT sandbox partner accounts before submission |
| Using XR-only language with Sony / Nintendo teams | Cross-platform vocabulary collapses; finger-pointing | Translate findings via the comparison table above |
| Treating Steam Direct review as "real cert" | Misses console requirements that wouldn't surface on Steam | Use the four regimes' actual requirements docs - Steam is not a proxy |
| Cross-network play without privilege checks | Xbox XR-045 / XR-007 fail - CFR | Use `XPRIVILEGE_*` constants per the [XR-045 privilege table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Achievements that "drift" between updates | Xbox XR-060 fail - published achievements can't change unlock rules / rewards | Lock achievement design before launch; only modify name / description / icon post-launch |
| Local-storage writes > 1 GiB / 5 min | Xbox XR-133 fail | Rate-limit save / cache flushes |

## Limitations

- **NDA-only details.** Sony TRC and Nintendo Lotcheck exact clause numbers,
  SLAs, severity vocabulary, and bench matrices are behind gated portals - see
  the NDA note above and
  [references/console-nda-regimes.md](references/console-nda-regimes.md).
- **Version churn.** XR numbers and GDK monikers change release-to-release -
  see the Versioning and deprecation section.
- **Cloud / streaming variants** (Xbox Cloud Gaming, PlayStation Cloud
  Streaming, GeForce NOW, Nintendo Cloud Streaming) have additional
  supplementary requirements not enumerated here.
- **Region-specific overlays** (China's NPPA, Korea's GRAC, EU EAA from
  2025-06-28) layer on top of platform cert and are out of scope of this
  skill - consult per-region documentation.
- **Mobile** (iOS App Store / Google Play / Galaxy Store) is not a "platform
  cert" in the console sense; not covered.
