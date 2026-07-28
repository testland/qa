# Microsoft Xbox Certification - reference

Full Xbox regime detail for platform-cert-overview-reference. Version-specific
notes (XR v16.1, GDK monikers, retired XRs) are consolidated in the skill's
"Versioning and deprecation" section.

## Source of truth

- **Process:** [Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide)
  on learn.microsoft.com.
- **Requirements:** [Xbox Requirements for Xbox Console Games](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements)
  (currently v16.1, dated 5/01/2026 per the page).
- **Test cases:** [Certification Tested Xbox Requirements and Test Cases](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/console-certification-requirements-and-tests).
- **PC counterpart:** [Xbox Network Policies for PC and Mobile](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc).

## Stages

Per the
[Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide),
a submission goes through three stages in order:

1. **Submission checks** - Submission Validator + malware scan.
   "Submission Validator gives feedback to developers and allows
   them to address common problems that would cause titles to fail
   ingestion into Partner Center and/or Certification."
2. **Build verification testing (BVTs)** - "a reduced test pass
   designed to make sure a product is fully testable and
   configured properly before entering full certification testing".
3. **Xbox Requirement (XR) testing** - "the bulk of the testing
   and is where all applicable XR test cases will be validated
   against your title."

## Submission types and SLAs

Per the same guide:

| Submission type | Console SLA | PC (MSIXVC) SLA |
|---|---|---|
| Disc | 6 business days | N/A |
| Digital | 5 business days | 3 business days |
| Digital Content-Update | 3 business days | 1 business day (incl. bypass) |

There are **two test-pass types**:

- **Optional submission** - paid, tested in **CERT.DEBUG**
  sandbox with red-signed content; no pass/fail decision.
- **Final submission** - last pass before release / RTM; tested
  in **CERT** sandbox with green-signed content on retail devices.

## XR categories

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
| Achievements and Awards | XR-055 (Counts and Gamerscore - min 10, max 100 launch / 500 lifetime, single ach ≤ 200 GS), XR-057 (No real-money unlocks), XR-058 (No cross-title sharing), XR-060 (No modifying active achievements), XR-062 (PEGI 12 / ESRB EVERYONE 10+ name and description content) |
| Multiplayer sessions | XR-064 (Joinable via shell), XR-067 (MPSD session state), XR-070 (Friends Lists), XR-124 (Game Invitations) |
| Betas and Game Previews | XR-117 (Beta notification splash) |

XRs that are **tested in Cert** are marked with an asterisk on the
source page; not all XRs are tested every submission. See the test
cases page above for per-XR Test Steps + Expected Behavior + Pass /
Fail examples.

## Issue severity vocabulary

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

## Common hold reasons

Per the same guide, titles are most often placed on **Hold**
because of:

- "Missing or non-functioning partner accounts that are required
  for testing."
- "Partner services do not support the CERT.DEBUG and CERT
  sandboxes."
- "Multiplayer does not work as expected."

(Multiplayer issues are a particularly common cert blocker - see
`multiplayer-state-machine-coverage`
for the test patterns that catch them pre-submission.)

## Bench layout (compatibility matrix)

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

## Reports

Three report types (per same guide):

- **Optional complete report** - issued at end of Optional Submission; no pass / fail; lists SRIs and CFRs.
- **Final pass / fail report** - issued at end of Final Submission; the decision report.
- **Interim report** - mid-pass snapshot; no pass / fail.

## Exception requests

Per the guide: "If your title is not fully compliant with any
Xbox Requirement (XR), you can request an exception for that XR.
This might occur if your title is introducing innovative features
or if strong technical limitations would prevent the title from
meeting the XR." Work with Microsoft contacts well in advance -
"approval of an exception is not guaranteed."
