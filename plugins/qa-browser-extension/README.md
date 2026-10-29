# qa-browser-extension

Firefox + Chrome extension testing: the Playwright fixture layer (with the load/reload matrix and chrome.storage test suite), messaging assertions, and the Manifest V3 test-surface reference (with Mozilla's web-ext CLI for Firefox runs and AMO signing)

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | chrome-extension-messaging-tests | Assert chrome.runtime/tabs/connect messaging, externally_connectable, native messaging, payload limits |
| skill | playwright-extension-fixtures | Playwright `launchPersistentContext` + load-extension args + service-worker race fixture; MV3 test surface (manifest field map, Firefox/Chrome key matrix, SW restrictions, `web-ext` CLI), reload matrix and chrome.storage quota/area/event tests in references/ |
| agent | [extension-test-author](agents/extension-test-author.md) | Detects Manifest version (V2 vs V3) + target browser (Chromium vs Firefox) from manifest.json, then emits one Playwright spec per behavior spec covering background SW, content script, popup, options page, messaging, or chrome.storage event surfaces. Sibling of qa-pwa/pwa-test-author. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-browser-extension@testland-qa
```
