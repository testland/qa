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
