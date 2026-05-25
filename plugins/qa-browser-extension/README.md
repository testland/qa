# qa-browser-extension

Firefox + Chrome extension lifecycle, MV2 to MV3 migration, host-permission prompts, and storage.sync vs storage.local test patterns

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | manifest-v3-test-surface-reference | S2 | MV2/MV3 manifest field map + Firefox/Chrome key matrix + SW runtime restrictions |
| skill | web-ext-cli-mozilla | S1 | Mozilla `web-ext` v8 CLI: lint + run + build + sign for Firefox and Chromium |
| skill | chrome-extension-test-loader | S1 | Unpacked-extension dev load + chrome.runtime/tabs/connect messaging API surface |
| skill | playwright-extension-fixtures | S1 | Playwright `launchPersistentContext` + load-extension args + service-worker race fixture |
| skill | mv2-to-mv3-migration-test-checklist | S3 | Build a per-extension MV2 to MV3 migration checklist artifact with section-by-section verification tests |
| skill | extension-storage-test-author | S3 | Build a chrome.storage area-selection + quota-exceeded + onChanged + managed-readonly test suite |
| agent | [extension-test-author](agents/extension-test-author.md) | A2 | Detects Manifest version (V2 vs V3) + target browser (Chromium vs Firefox) from manifest.json, then emits one Playwright spec per behavior spec covering background SW, content script, popup, options page, or chrome.storage event surfaces. Distinct from qa-shift-left/spec-to-suite-orchestrator (language-agnostic project skeleton) and sibling of qa-pwa/pwa-test-author. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-browser-extension@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
