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
