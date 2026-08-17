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
