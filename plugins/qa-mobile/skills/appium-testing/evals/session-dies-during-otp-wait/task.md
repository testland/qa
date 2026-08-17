# The two-factor test loses its session about half the time

## Problem Description

Our login test signs in, then waits for a one-time code that another team's
helper polls out of a test mailbox. That mailbox is slow and variable: usually
40 seconds, sometimes 90, occasionally more. When the code arrives quickly the
test passes. When the mailbox takes longer, the very next thing we do after the
wait blows up saying the session is either terminated or not started, and every
remaining step in that test fails with an invalid session id.

Nothing crashes on the device - if you are watching the emulator, the app is
still sitting there on the code-entry screen. It is the server that has given
up; the server log has a line about shutting down while it waited.

We have already tried raising the pytest timeout to ten minutes and adding a
rerun plugin. Neither helped: the reruns fail the same way, and the timeout was
never what was firing.

This only affects the one test that waits on the mailbox. The other forty tests
are fine and take a couple of seconds per step. Whatever we do must not make
those forty slower, and must not leave sessions alive on the device farm after
a crashed run - we pay by the minute there and we have been billed for stuck
sessions before.

`helpers/mailbox.py` belongs to the platform team and we cannot change it.

## Output Specification

1. Write `docs/otp-flake.md`: a short note stating what is ending the session,
   why runs where the mail arrives quickly survive, and why raising the test
   runner's timeout changed nothing.
2. Fix `tests/conftest.py` and `tests/test_login.py` so a 90-second mailbox
   wait no longer loses the session.
3. The safety net that stops abandoned sessions from holding a device forever
   must still work after your change. Do not disable it.
4. Do not change `helpers/mailbox.py`, and do not add reruns or retries.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
import os
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

SERVER = os.environ.get("APPIUM_URL", "http://127.0.0.1:4723")
APK = os.path.join(os.path.dirname(__file__), "..", "build", "app-debug.apk")

BASE_CAPS = {
    "platformName": "Android",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": "Android Emulator",
    "appium:app": APK,
}


@pytest.fixture
def driver():
    d = webdriver.Remote(SERVER, options=UiAutomator2Options().load_capabilities(BASE_CAPS))
    d.implicitly_wait(10)
    yield d
    d.quit()

=============== FILE: tests/test_login.py ===============
from helpers.mailbox import wait_for_code


def test_signs_in_with_a_one_time_code(driver):
    driver.find_element("accessibility id", "email-field").send_keys("qa+otp@acme.test")
    driver.find_element("accessibility id", "send-code").click()

    # blocks until the mailbox has the message; 40s on a good day, 90s+ on a bad one
    code = wait_for_code("qa+otp@acme.test", timeout=180)

    driver.find_element("accessibility id", "code-field").send_keys(code)
    driver.find_element("accessibility id", "verify").click()
    assert driver.find_element("accessibility id", "account-home").is_displayed()

=============== FILE: helpers/mailbox.py ===============
import time
import requests

MAILBOX_API = "https://mailbox.internal.acme.test/api/messages"


def wait_for_code(address, timeout=180):
    """Poll the shared test mailbox until a one-time code shows up."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(MAILBOX_API, params={"to": address}, timeout=10)
        for message in r.json().get("messages", []):
            if message.get("code"):
                return message["code"]
        time.sleep(5)
    raise TimeoutError(f"no one-time code for {address} within {timeout}s")

=============== FILE: logs/otp-failure.log ===============
[HTTP] --> POST /session/8f21.../element  (send-code)
[HTTP] <-- POST /session/8f21.../element 200 91 ms
[Appium] Shutting down because we waited 60 seconds for a command
[Appium] Removing session 8f21... from our master session list
[HTTP] --> POST /session/8f21.../element  (code-field)
[HTTP] <-- POST /session/8f21.../element 404 6 ms - 812
[debug] NoSuchDriverError: A session is either terminated or not started
