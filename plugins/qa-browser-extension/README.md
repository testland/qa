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

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-browser-extension@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
