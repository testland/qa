# The suite only starts a session on the laptop it was written on

## Problem Description

`tests/conftest.py` names one exact phone model and one exact OS release. That
combination existed on the machine of the person who wrote it, in March. It
does not exist on the laptops we bought in June, it does not exist on the CI
macOS image since the image was bumped, and the Android side names an emulator
profile that only exists if you created it by hand with that exact name.

When it does not match, the run dies during session creation with the server
saying it cannot find a matching device - long before any assertion runs.

`git log tests/conftest.py` is now nine commits of people flipping the model
string to whatever their own machine has, half of them pushed by accident. Two
of those commits broke CI for everyone else.

We run this suite in three places: developer laptops (mixed hardware, mixed
Xcode versions), the CI macOS image for iOS, and the CI Linux image for
Android. We want one committed file that works in all three without anyone
editing it.

## Output Specification

1. Rework `tests/conftest.py` so the same committed code creates a session on a
   developer laptop, on the CI macOS image, and on the CI Linux image, with no
   local edits.
2. Where a specific device genuinely has to be named - pinning a model for a
   reproduction, say - that value must come from outside the committed test
   code, and the committed default must not be one particular model or OS
   release.
3. If no device can be resolved, the run must fail with a message that names
   what to set, rather than the raw server error.
4. Keep both platforms working. Do not modify `tests/test_cart.py`.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
import os
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.options.ios import XCUITestOptions

SERVER = os.environ.get("APPIUM_URL", "http://127.0.0.1:4723")
BUILD = os.path.join(os.path.dirname(__file__), "..", "build")


def _ios_options():
    return XCUITestOptions().load_capabilities({
        "platformName": "iOS",
        "appium:automationName": "XCUITest",
        "appium:deviceName": "iPhone 15 Pro",
        "appium:platformVersion": "17.4",
        "appium:app": os.path.join(BUILD, "Shop.app"),
    })


def _android_options():
    return UiAutomator2Options().load_capabilities({
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": "Pixel_7_API_34",
        "appium:platformVersion": "14",
        "appium:app": os.path.join(BUILD, "app-debug.apk"),
    })


@pytest.fixture
def driver(request):
    target = os.environ.get("TARGET", "android")
    options = _ios_options() if target == "ios" else _android_options()
    d = webdriver.Remote(SERVER, options=options)
    yield d
    d.quit()

=============== FILE: tests/test_cart.py ===============
def test_adds_an_item(driver):
    driver.find_element("accessibility id", "product-0").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    assert driver.find_element("accessibility id", "cart-count").text == "1"


def test_removes_the_last_item(driver):
    driver.find_element("accessibility id", "cart-tab").click()
    driver.find_element("accessibility id", "remove-item-0").click()
    assert driver.find_element("accessibility id", "cart-count").text == "0"

=============== FILE: logs/session-create-failures.txt ===============
# developer laptop, Xcode 16, iOS target
[XCUITest] Error: Unable to find a device matching 'iPhone 15 Pro' with
[XCUITest] platform version '17.4'. Available devices: iPhone 16, iPhone 16 Pro,
[XCUITest] iPhone 16 Pro Max, iPad Pro 13-inch (M4)

# CI linux image, android target
[UiAutomator2] Error: Could not find a connected device or emulator named
[UiAutomator2] 'Pixel_7_API_34'. Connected: emulator-5554
