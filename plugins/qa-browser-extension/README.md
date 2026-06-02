# qa-browser-extension

Firefox + Chrome extension lifecycle, MV2 to MV3 migration, host-permission prompts, and storage.sync vs storage.local test patterns

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | manifest-v3-test-surface-reference | MV2/MV3 manifest field map + Firefox/Chrome key matrix + SW runtime restrictions |
| skill | web-ext-cli-mozilla | Mozilla `web-ext` v8 CLI: lint + run + build + sign for Firefox and Chromium |
| skill | chrome-extension-test-loader | Unpacked-extension dev load + chrome.runtime/tabs/connect messaging API surface |
| skill | playwright-extension-fixtures | Playwright `launchPersistentContext` + load-extension args + service-worker race fixture |
| skill | mv2-to-mv3-migration-test-checklist | Build a per-extension MV2 to MV3 migration checklist artifact with section-by-section verification tests |
| skill | extension-storage-test-author | Build a chrome.storage area-selection + quota-exceeded + onChanged + managed-readonly test suite |
| agent | [extension-test-author](agents/extension-test-author.md) | Detects Manifest version (V2 vs V3) + target browser (Chromium vs Firefox) from manifest.json, then emits one Playwright spec per behavior spec covering background SW, content script, popup, options page, or chrome.storage event surfaces. Distinct from qa-shift-left/spec-to-suite-orchestrator (language-agnostic project skeleton) and sibling of qa-pwa/pwa-test-author. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-browser-extension@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
