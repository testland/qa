---
description: Short prompt that should load chrome-extension-messaging-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I test chrome.runtime.sendMessage between a content script and the background worker?
