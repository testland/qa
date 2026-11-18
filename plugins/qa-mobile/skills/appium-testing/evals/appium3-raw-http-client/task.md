# Our smoke script stopped working after the Appium 3 upgrade

## Problem Description

After moving CI to Appium 3, our release smoke script and its server start script stopped working (`tools/smoke.py`, `tools/start-appium.sh`, `docs/upgrade.md`). Fix both, keeping plain HTTP.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tools/smoke.py ===============
# Tiny smoke script used by the release bot. Talks to Appium over plain HTTP.
import requests
A = "http://127.0.0.1:4723"

def kill_stale_sessions():
    for s in requests.get(f"{A}/sessions").json()["value"]:
        requests.delete(f"{A}/session/{s['id']}")

def main():
    kill_stale_sessions()
    r = requests.post(f"{A}/session", json={"desiredCapabilities": {
        "platformName": "Android", "automationName": "UiAutomator2",
        "deviceName": "emulator-5554", "app": "/builds/shop.apk"}})
    sid = r.json()["sessionId"]
    el = requests.post(f"{A}/session/{sid}/element",
                       json={"using": "accessibility id", "value": "search"}).json()["value"]
    eid = el["ELEMENT"]
    requests.post(f"{A}/session/{sid}/appium/element/{eid}/value", json={"value": list("sneakers")})
    # swipe up to load more results
    requests.post(f"{A}/session/{sid}/touch/perform", json={"actions": [
        {"action": "press", "options": {"x": 540, "y": 1600}},
        {"action": "moveTo", "options": {"x": 540, "y": 400}},
        {"action": "release", "options": {}}]})
    requests.delete(f"{A}/session/{sid}")

main()

=============== FILE: tools/start-appium.sh ===============
#!/usr/bin/env bash
appium --port 4723 --allow-insecure=adb_shell

=============== FILE: docs/upgrade.md ===============
We upgraded the CI image to Appium 3 (and the latest UiAutomator2 driver).
The server no longer starts with our script, and smoke.py fails at every step after we
remove the flag by hand. We want to keep the script on plain HTTP (no client library).
