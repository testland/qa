---
name: platform-cert-overview-reference
description: "Pure-reference catalog of the four platform-holder certification regimes a multi-platform title submits to before release: Microsoft Xbox Requirements (XR) / Xbox certification on learn.microsoft.com, Sony Technical Requirements Checklist (TRC) on the gated PlayStation DevNet portal, Nintendo Lotcheck on the gated Nintendo Developer Portal, and Steam Direct review on partner.steamgames.com. Documents the submission workflow, severity / pass-fail vocabulary, test-bench configurations, and known SLAs for each platform. Cites public sources inline; cites gated NDA portals by stable ID per PLUGIN_AUTHORING.md Step 4 fallback. Use when planning a cert calendar, mapping internal QA findings to the platform's vocabulary, or sequencing submissions across platforms."
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

This skill **pairs with**
`game-test-categories-reference`
which defines the six canonical test categories (functional / compliance /
compatibility / performance / localization / accessibility) that map across
all four regimes.

## When to use

- Planning a cert calendar - when to submit, expected SLA, how
  many parallel passes to budget.
- Mapping a CFR / hold / fail back to internal QA categories.
- Sequencing submissions across platforms - which platform tends
  to surface which class of issue first.
- Onboarding a new team member to the cert vocabulary without
  full NDA-portal access on day 1.

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating cert as a Q4 milestone | Late-found CFRs delay launch by weeks | Run XR / TRC checklists from milestone 1 |
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
