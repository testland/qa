---
description: Short prompt that should load xcuitest-suite with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our XCUITest suite fails on CI because elements can't be found by their label text after we added localization. How do we fix the locators?
