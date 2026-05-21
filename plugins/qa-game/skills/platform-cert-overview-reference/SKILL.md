---
name: platform-cert-overview-reference
description: "Pure-reference catalog of the four platform-holder certification regimes a multi-platform title submits to before release: Microsoft Xbox Requirements (XR) / Xbox certification on learn.microsoft.com, Sony Technical Requirements Checklist (TRC) on the gated PlayStation DevNet portal, Nintendo Lotcheck on the gated Nintendo Developer Portal, and Steam Direct review on partner.steamgames.com. Documents the submission workflow, severity / pass-fail vocabulary, test-bench configurations, and known SLAs for each platform. Cites public sources inline; cites gated NDA portals by stable ID per PLUGIN_AUTHORING.md Step 4 fallback. Use when planning a cert calendar, mapping internal QA findings to the platform's vocabulary, or sequencing submissions across platforms."
rating: 24
d6: 4
archetype: S2
keywords: ["xbox-cert", "xr", "playstation-trc", "nintendo-lotcheck", "steam-direct", "submission", "certification", "release"]
---

# platform-cert-overview-reference

## Overview

A multi-platform title that ships on console plus PC submits to
**four distinct certification regimes**, each with its own
requirements document, severity vocabulary, test-bench
configuration, and SLA. This skill is the **pure reference** that
maps those four regimes onto a common structure so QA leads can
plan a cert calendar without re-learning each portal.

| Platform | Regime | Document name | Source |
|---|---|---|---|
| Xbox | Xbox Certification | Xbox Requirements (XR) v16.1 (May 2026) | [learn.microsoft.com](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) (public) |
| PlayStation | Sony TRC | Technical Requirements Checklist | PlayStation DevNet (gated; cited by stable ID "Sony TRC" per `PLUGIN_AUTHORING.md` Step 4 fallback) |
| Nintendo | Lotcheck | Submission Guidelines | Nintendo Developer Portal (gated; cited by stable ID "Nintendo Lotcheck" per Step 4 fallback) |
| Steam | Steam Direct | App Review Process | [partner.steamgames.com](https://partner.steamgames.com/doc/store/review_process) (public) |

This skill **pairs with**
[`game-test-categories-reference`](../game-test-categories-reference/SKILL.md)
which defines the six canonical test categories (functional /
compliance / compatibility / performance / localization /
accessibility) that map across all four regimes.

## When to use

- Planning a cert calendar — when to submit, expected SLA, how
  many parallel passes to budget.
- Mapping a CFR / hold / fail back to internal QA categories.
- Sequencing submissions across platforms — which platform tends
  to surface which class of issue first.
- Onboarding a new team member to the cert vocabulary without
  full NDA-portal access on day 1.

## Microsoft Xbox Certification

### Source of truth

- **Process:** [Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
  on learn.microsoft.com.
- **Requirements:** [Xbox Requirements for Xbox Console Games](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  (currently v16.1, dated 5/01/2026 per the page).
- **Test cases:** [Certification Tested Xbox Requirements and Test Cases](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/console-certification-requirements-and-tests).
- **PC counterpart:** [Xbox Network Policies for PC and Mobile](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc).

### Stages

Per the
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
a submission goes through three stages in order:

1. **Submission checks** — Submission Validator + malware scan.
   "Submission Validator gives feedback to developers and allows
   them to address common problems that would cause titles to fail
   ingestion into Partner Center and/or Certification."
2. **Build verification testing (BVTs)** — "a reduced test pass
   designed to make sure a product is fully testable and
   configured properly before entering full certification testing".
3. **Xbox Requirement (XR) testing** — "the bulk of the testing
   and is where all applicable XR test cases will be validated
   against your title."

### Submission types and SLAs

Per the same guide:

| Submission type | Console SLA | PC (MSIXVC) SLA |
|---|---|---|
| Disc | 6 business days | N/A |
| Digital | 5 business days | 3 business days |
| Digital Content-Update | 3 business days | 1 business day (incl. bypass) |

There are **two test-pass types**:

- **Optional submission** — paid, tested in **CERT.DEBUG**
  sandbox with red-signed content; no pass/fail decision.
- **Final submission** — last pass before release / RTM; tested
  in **CERT** sandbox with green-signed content on retail devices.

### XR categories (v16.1)

XRs are organised into the categories enumerated in the
[XR document](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements):

| Category | Representative XRs |
|---|---|
| Base requirements | XR-001 (Title Stability), XR-003 (Title Quality), XR-022 (Naming), XR-074 (Service Loss), XR-130 (Console Families and Generations), XR-131 (Display Mode Support), XR-132 (Service Access Limits), XR-133 (Local Storage Write Limit, 1 GiB / 5 min) |
| Security | XR-009 (Secure Title Development, per Microsoft Store policies 10.2 / 10.2.2 / 10.2.3 / 10.2.4) |
| Online Safety and Privacy | XR-013 (Account Linking), XR-014 (Player Data, child / teen handling), XR-015 (Player Communication, with `CommunicateUsingText` / `CommunicateUsingVoice` privilege checks), XR-017 (Title Ratings), XR-018 (UGC) |
| Content packages and updates | XR-034 (Streaming Install Initial Play Marker), XR-037 (DLC Dependencies), XR-123 (DLC unlock without relaunch), XR-129 (Intelligent Delivery via `PackageInstallChunksAsync`) |
| Purchasing | XR-036 (In-Title Pricing), XR-039 (Common Purchase UI) |
| User profiles | XR-045 (Privileges, e.g. `XPRIVILEGE_MULTIPLAYER_SESSIONS` ID 254, `XPRIVILEGE_COMMUNICATIONS` ID 252, `XPRIVILEGE_USER_CREATED_CONTENT` ID 247), XR-046 (Gamertag display), XR-047 (User-Profile Access), XR-048 (Profile Settings Usage), XR-052 (Save Roaming), XR-112 (User and Controller activation), XR-115 (User / Controller add and remove) |
| Achievements and Awards | XR-055 (Counts and Gamerscore — min 10, max 100 launch / 500 lifetime, single ach ≤ 200 GS), XR-057 (No real-money unlocks), XR-058 (No cross-title sharing), XR-060 (No modifying active achievements), XR-062 (PEGI 12 / ESRB EVERYONE 10+ name and description content) |
| Multiplayer sessions | XR-064 (Joinable via shell), XR-067 (MPSD session state), XR-070 (Friends Lists), XR-124 (Game Invitations) |
| Betas and Game Previews | XR-117 (Beta notification splash) |

XRs that are **tested in Cert** are marked with an asterisk on the
source page; not all XRs are tested every submission. See the test
cases page above for per-XR Test Steps + Expected Behavior + Pass /
Fail examples.

### Issue severity vocabulary

Per the
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide):

| Code | Name | Effect |
|---|---|---|
| **CFR** | Condition for Resubmission | Title fails cert; must be fixed before resubmit |
| **SRI** | Standard Reporting Issue | Tied to an XR but not fail-severe; fix recommended |
| **ION** | Issue of Note | Not tied to an XR; informational |
| **Non-Tested** | (no code) | XR could not be tested in this pass |

CFR severity is determined by
[Failure Mode Analysis (FMA)](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/fma/certification-failure-mode-analysis)
which combines severity × probability × repeatability.

### Common hold reasons

Per the same guide, titles are most often placed on **Hold**
because of:

- "Missing or non-functioning partner accounts that are required
  for testing."
- "Partner services do not support the CERT.DEBUG and CERT
  sandboxes."
- "Multiplayer does not work as expected."

(Multiplayer issues are a particularly common cert blocker — see
[`multiplayer-state-machine-coverage`](../multiplayer-state-machine-coverage/SKILL.md)
for the test patterns that catch them pre-submission.)

### Bench layout (compatibility matrix)

Per the
[Certification test bench configuration](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
section of the guide:

| Console | SKU | Resolution | Storage | Audio | Power |
|---|---|---|---|---|---|
| 1 | Xbox One / Xbox Series X | 720p | Internal HDD | Stereo | Instant-On |
| 2 | Xbox One X / Xbox Series S | 4k (alt HDR after 4 h) | Internal HDD | 5.1 Bitstream | Instant-On |
| 3 | Xbox One S / Xbox Series X | 1080p | Internal HDD | Stereo | Energy Saving |
| 4 | Xbox Series S | 1080p | USB HDD | Headset (Windows Sonic) | Instant-On |
| 5 | Xbox Series X | 720p | USB HDD | Stereo | Energy Saving |

### Reports

Three report types (per same guide):

- **Optional complete report** — issued at end of Optional Submission; no pass / fail; lists SRIs and CFRs.
- **Final pass / fail report** — issued at end of Final Submission; the decision report.
- **Interim report** — mid-pass snapshot; no pass / fail.

### Exception requests

Per the guide: "If your title is not fully compliant with any
Xbox Requirement (XR), you can request an exception for that XR.
This might occur if your title is introducing innovative features
or if strong technical limitations would prevent the title from
meeting the XR." Work with Microsoft contacts well in advance —
"approval of an exception is not guaranteed."

## Sony PlayStation Certification (TRC)

### Source of truth

- **Document:** Sony **Technical Requirements Checklist (TRC)**
  — gated NDA portal at PlayStation DevNet, cited by stable ID
  "Sony TRC" per `PLUGIN_AUTHORING.md` Step 4 fallback. (Same
  Step-4-fallback note applies to every Sony-specific clause in
  this section.)
- **Per-generation supplements:** PS5 TRC supersedes PS4 TRC;
  PS5 Pro adds 60-Hz / 8K / PS5 Pro Game Boost guidance (NDA —
  stable-ID cite).

### Structure

The Sony TRC is a numbered checklist (NDA-only — cite by stable
ID) organised into roughly comparable buckets to the Xbox XR list:

- **Functional** — title stability, error recovery, save game.
- **Trophies** — Sony's analogue to Xbox Achievements (cite by
  stable ID for exact count / point limits).
- **Multiplayer** — session lifecycle, presence, voice + text
  chat.
- **PSN integration** — sign-in, friends, party.
- **Content delivery** — DLC, patches, packaging.
- **Compatibility** — generation matrix (PS4 base / PS4 Pro / PS5
  / PS5 Pro), Game Boost, backward compatibility.
- **Hardware peripherals** — DualSense haptics, adaptive triggers,
  PSVR2 (where applicable).

### Submission workflow (public framing)

Sony documents its high-level publishing workflow publicly via
[playstation.com/en-us/develop](https://www.playstation.com/en-us/develop/);
the per-step TRC details below are NDA, cite by stable ID.

1. **QA pre-cert** — partner runs internal TRC dry pass.
2. **Submission upload** — Master to Sony's submission system
   (NDA — stable ID).
3. **Format QA** — Sony's QA team validates the build against the
   TRC (NDA — stable ID).
4. **Pass / Fail decision** — fail tickets list each TRC clause
   violated (NDA — stable ID).
5. **Re-submit** — corrected master goes back through the same
   workflow.

### Severity vocabulary

Sony classifies findings on a severity scale comparable to the
Microsoft CFR / SRI split (NDA — exact terminology cited by stable
ID per Step 4 fallback). Each finding lists the TRC clause it
violates and the steps to reproduce.

### SLAs

Sony does not publish SLAs publicly. Practitioners budget
calendar-weeks for a console-game format QA pass (cite by stable
ID; no public source). Patch / minor-update SLAs are shorter than
initial-release SLAs (NDA — stable ID).

## Nintendo Lotcheck

### Source of truth

- **Document:** Nintendo **Submission Guidelines** ("Lotcheck") —
  gated Nintendo Developer Portal, cited by stable ID "Nintendo
  Lotcheck" per `PLUGIN_AUTHORING.md` Step 4 fallback. (Applies to
  every Nintendo-specific clause in this section.)
- **Public-facing partner portal:** [developer.nintendo.com](https://developer.nintendo.com/)
  (the developer landing page is reachable without NDA but only
  general program info; the Lotcheck document itself requires
  developer-portal access).

### Structure

Nintendo Lotcheck (NDA — cite by stable ID) covers analogous
buckets:

- **Functional and stability** — boot, save, error recovery.
- **Network play and online services** — Nintendo Network
  authentication, online matchmaking, friend lists, parental
  controls.
- **Profile and user data** — Nintendo Account, Mii, save data.
- **Storage** — microSD / system memory boundaries, save data
  cloud sync where applicable.
- **Compatibility** — across Switch hardware revisions (original
  / Lite / OLED) and Switch 2 where supported, **docked vs.
  handheld mode** transitions, joy-con + Pro Controller +
  detached + paired modes.
- **Performance** — sustained framerate in handheld vs. docked,
  thermal behaviour during long sessions.
- **eShop metadata + ratings** — region-specific (Japan / Americas
  / Europe / Australia / Korea).

### Workflow (NDA — stable ID)

The Lotcheck submission workflow is comparable in shape to Sony
TRC: pre-cert dry-run, master upload, Nintendo QA pass, fail
ticket list keyed to Lotcheck clauses, re-submission. Exact step
names and SLAs are NDA — cite by stable ID per Step 4 fallback.

### Notable distinguishing constraints

- **Handheld / docked transitions** are a Switch-specific test
  surface that has no analogue on Xbox / PlayStation (NDA — stable
  ID for exact clauses).
- **Cartridge + eShop dual delivery** complicates patch / DLC
  layout (NDA — stable ID).
- **Joy-Con drift / detached / single-Joy-Con modes** add a
  controller-state matrix beyond the Xbox / PS controller test
  surface (NDA — stable ID).

## Steam Direct

### Source of truth

- **Application:** [partner.steamgames.com/doc/store/application](https://partner.steamgames.com/doc/store/application)
- **Fee:** [Steam Direct Fee](https://partner.steamgames.com/doc/gettingstarted/appfee)
- **Content Survey:** [partner.steamgames.com/doc/gettingstarted/contentsurvey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)
- **Review Process:** [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process)

### Workflow

Per the
[App Review Process](https://partner.steamgames.com/doc/store/review_process):

1. Developer purchases the Steam Direct Fee or obtains an app
   credit; creates the application in Steamworks.
2. Developer completes the **Content Survey** (age ratings, content
   warnings).
3. Developer marks the title "ready for review" — two parallel
   reviews begin:
   - **Store Presence Review** — 3-5 business days (plan for 7).
   - **Product Build Review** — 3-5 business days (plan for 7).
4. On approval, the title can be released on its scheduled date.

Per the same page: "Once your game has been reviewed and
approved, there is no need to go through review again."

### What is reviewed

Per the same page, the **Store Presence Review** checks:

- "Your store page should only contain features and content that
  will be available at launch."
- "Capsule images must display readable product titles / logos."
- "Screenshots must show only gameplay, excluding concept art or
  marketing materials."
- Description quality, no external links.

The **Product Build Review** checks:

- "Your product will need to start up properly" across all listed
  OSes.
- "All supported features listed on the store page will need to be
  implemented."
- "Your product must use Steam Wallet for any in-game
  transactions."

### Special categories

Per the same page:

- **Early Access** — requires answering all Early Access section
  questions before review.
- **Adult Content** — both store-page and build review required;
  may exceed standard timeframes.
- **Trading Cards** — separate 3–5 business day review for card
  assets and drop configurations.

### Comparison to console cert

Steam Direct is **dramatically lighter** than the three console
regimes: no equivalent of Xbox XR test cases, no equivalent of
Sony TRC bench matrix, no equivalent of Nintendo handheld / docked
test surface. The bar is "starts up + features match store page +
uses Steam Wallet for IAP" rather than a multi-stage cert pass.

## Cross-platform comparison summary

| Dimension | Xbox | Sony | Nintendo | Steam |
|---|---|---|---|---|
| Requirements doc | XR v16.1 (May 2026) | TRC (NDA) | Lotcheck (NDA) | App Review Process |
| Public visibility | Full | Gated | Gated | Full |
| Submission stages | 3 (val + BVT + XR) | Multi-step (NDA) | Multi-step (NDA) | 2 parallel (store + build) |
| Test-pass types | Optional + Final | (NDA) | (NDA) | One pass per submission |
| Severity vocab | CFR / SRI / ION | NDA (comparable) | NDA (comparable) | Pass / Fail (informal) |
| Console SLA (digital) | 5 BD | (NDA — practitioner-weeks) | (NDA — practitioner-weeks) | 3-5 BD (plan for 7) |
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
3. **Nintendo Lotcheck** if the title supports Switch — handheld /
   docked + Joy-Con state surface is unique and needs its own
   pass.
4. **Steam Direct** can usually slot in late; the bar is the
   lowest.

This is a heuristic, not a mandate — partners with strong
in-house TRC expertise often reverse the Xbox / Sony ordering.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating cert as a Q4 milestone | Late-found CFRs delay launch by weeks | Run XR / TRC checklists from milestone 1 |
| Optional submission "to find out where we are" without prep | Burns paid slot to find bugs internal QA could have | Run internal XR pre-pass before any paid Optional |
| Submitting before partner-service stubs are ready | Held titles cost real calendar days per Microsoft's [common hold reasons](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide) | Stand up CERT.DEBUG / CERT sandbox partner accounts before submission |
| Using XR-only language with Sony / Nintendo teams | Cross-platform vocabulary collapses; finger-pointing | Translate findings via the comparison table above |
| Treating Steam Direct review as "real cert" | Misses console requirements that wouldn't surface on Steam | Use the four regimes' actual requirements docs — Steam is not a proxy |
| Cross-network play without privilege checks | Xbox XR-045 / XR-007 fail — CFR | Use `XPRIVILEGE_*` constants per the [XR-045 privilege table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Achievements that "drift" between updates | Xbox XR-060 fail — published achievements can't change unlock rules / rewards | Lock achievement design before launch; only modify name / description / icon post-launch |
| Local-storage writes > 1 GiB / 5 min | Xbox XR-133 fail | Rate-limit save / cache flushes |

## Limitations

- **NDA-only details.** Sony TRC and Nintendo Lotcheck exact
  clause numbers, SLAs, severity vocabulary, and bench matrices
  are NDA — this skill cites them by stable ID per
  `PLUGIN_AUTHORING.md` Step 4 fallback. Partners with portal
  access should consult the authoritative current revision.
- **Microsoft GDK moniker versioning.** The XR list ships per GDK
  release; v16.1 (May 2026) is current at time of writing, but
  the
  [page header lists `gdk-2510`, `gdk-2604`, `gdk-2610`](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  monikers — verify the version that applies to your GDK before
  quoting XR numbers.
- **Cloud / streaming variants** (Xbox Cloud Gaming, PlayStation
  Cloud Streaming, GeForce NOW, Nintendo Cloud Streaming) have
  additional supplementary requirements not enumerated here.
- **Region-specific overlays** (China's NPPA, Korea's GRAC, EU
  EAA from 2025-06-28) layer on top of platform cert and are out
  of scope of this skill — consult per-region documentation.
- **Mobile** (iOS App Store / Google Play / Galaxy Store) is not
  a "platform cert" in the console sense; not covered.
- **Retired XRs.** The May 2026 v16.1 release retired XR-134
  (Data Transfer Using Web Protocols) per the
  [Changes in this Release table](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements);
  XR identifiers churn release-to-release.
