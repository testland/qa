import os
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

SERVER = os.environ.get("APPIUM_URL", "http://127.0.0.1:4723")
APK = os.path.join(os.path.dirname(__file__), "..", "build", "app-debug.apk")


@pytest.fixture(scope="session")
def driver():
    options = UiAutomator2Options().load_capabilities({
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": "Android Emulator",
        "appium:app": APK,
        "appium:noReset": True,
        "appium:fullReset": False,
    })
    d = webdriver.Remote(SERVER, options=options)
    yield d
    d.quit()
