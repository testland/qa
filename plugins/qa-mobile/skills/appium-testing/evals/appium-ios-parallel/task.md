# Two iPhones on one Mac: one session always fails

## Problem Description

Our iOS suite runs on two real iPhones at once from one Mac and one Appium server. One of the two sessions always fails and the video recordings mix both phones (`ci-log.txt`). Fix `caps/ios-devices.json` and explain each change.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: caps/ios-devices.json ===============
[
  {
    "platformName": "iOS",
    "appium:automationName": "XCUITest",
    "appium:udid": "00008110-001A2B3C4D5E801E",
    "appium:app": "./apps/Shop.ipa",
    "appium:xcodeOrgId": "ABCDE12345",
    "appium:xcodeSigningId": "Apple Development"
  },
  {
    "platformName": "iOS",
    "appium:automationName": "XCUITest",
    "appium:udid": "00008120-000F1E2D3C4B501E",
    "appium:app": "./apps/Shop.ipa",
    "appium:xcodeOrgId": "ABCDE12345",
    "appium:xcodeSigningId": "Apple Development"
  }
]

=============== FILE: ci-log.txt ===============
One Mac mini, one Appium server, two iPhones on USB, both sessions started at the same time.
[session 2] xcodebuild error: build.db: database is locked. Possibly there are two concurrent builds running in the same filesystem location.
[session 2] Could not proxy command to the remote server. Original error: connect ECONNREFUSED 127.0.0.1:8100
[session 1] screen recording shows frames from both phones
