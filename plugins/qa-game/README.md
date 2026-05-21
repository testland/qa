# qa-game

Game engine testing (Unity, Unreal, Godot), platform certification overview (Sony TRC, Nintendo Lotcheck, MS XR, Steam Direct), multiplayer state machine coverage, and gameplay recording/replay

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | game-test-categories-reference | S2 | Six canonical game-test categories (functional / compliance / compatibility / performance / localization / accessibility) plus multiplayer + content-rating cross-axes, cross-referenced to Xbox XR / Sony TRC / Nintendo Lotcheck / Steam Direct vocabulary |
| skill | platform-cert-overview-reference | S2 | Submission workflow, severity vocab, bench matrix, and SLAs across Microsoft Xbox (XR v16.1), Sony TRC, Nintendo Lotcheck, and Steam Direct. Public sources inline; gated NDA portals cited by stable ID |
| skill | unity-test-framework | S1 | Unity game-engine Test Framework (com.unity.test-framework v1.8): EditMode vs PlayMode, NUnit 3.5 assertions, [Test] / [UnityTest] / [UnityPlatform] attributes, batch-mode CLI, CI integration. Distinct from the ThrowTheSwitch Unity C library covered by qa-embedded/unity-test-framework-c |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-game@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
