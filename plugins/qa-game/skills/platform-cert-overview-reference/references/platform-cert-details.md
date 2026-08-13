# Platform certification detail

Per-platform requirement documents, severity codes, and the compatibility
bench layout that back the six-category taxonomy in `SKILL.md`.

## Requirement documents by platform (Compliance)

| Platform | Document name | Source |
|---|---|---|
| Xbox console | Xbox Requirements (XRs) | [learn.microsoft.com/.../console/certification-requirements](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/certification-requirements) |
| Xbox PC | Xbox Network Policies for PC and Mobile | [learn.microsoft.com/.../pc/live-policies-pc](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/pc/live-policies-pc) |
| PlayStation | Technical Requirements Checklist (TRC) | Gated NDA portal; cite by stable ID "Sony TRC" |
| Nintendo | Lotcheck / Submission Guidelines | Gated NDA portal; cite by stable ID "Nintendo Lotcheck" |
| Steam | App Review Process | [partner.steamgames.com/doc/store/review_process](https://partner.steamgames.com/doc/store/review_process) |

Each requirement maps to test cases with explicit Test Steps, Expected Behavior, and Pass/Fail examples - see Microsoft's [Certification Tested Xbox Requirements for Xbox Console Games](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/console/console-certification-requirements-and-tests).

## Severity model (Xbox; broadly applicable)

| Code | Name | Effect |
|---|---|---|
| **CFR** | Condition for Resubmission | Title fails cert; must be fixed before resubmit |
| **SRI** | Standard Reporting Issue | Related to an XR but not severe enough to fail; fix recommended |
| **ION** | Issue of Note | Not tied to an XR; informational |
| **Non-Tested** | - | XR could not be tested in this pass |

Sony TRC and Nintendo Lotcheck use comparable severity tiers internally (NDA - cite by stable ID).

## Compatibility bench layout

The Xbox bench - per the [Certification step-by-step guide](https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/certification/certification-guide) - exemplifies the required matrix:

| Console | SKU | Resolution | Storage | Audio |
|---|---|---|---|---|
| Console 1 | Xbox One / Xbox Series X | 720p | Internal HDD | Stereo |
| Console 2 | Xbox One X / Xbox Series S | 4k | Internal HDD | 5.1 Bitstream |
| Console 3 | Xbox One S / Xbox Series X | 1080p | Internal HDD | Stereo |
| Console 4 | Xbox Series S | 1080p | USB HDD | Headset (Windows Sonic) |
| Console 5 | Xbox Series X | 720p | USB HDD | Stereo |

The same matrix logic applies to Sony (PS4 base / PS4 Pro / PS5 / PS5 Pro), Nintendo (Switch original / OLED / Switch 2), and PC (GPU vendor × driver version × OS × DirectX/Vulkan). Microsoft tracks cross-generation requirements under [XR-130: Xbox Console Families and Generations](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/policies/xr/xr130). Each bench console also varies **Console Language** to exercise localized assets in the cert pass.
