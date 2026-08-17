# Every test passes alone and the suite still fails

## Problem Description

Run `pytest tests/test_cart.py::test_adds_an_item` and it passes. Run the whole
file and it fails, because by then the onboarding carousel has already been
dismissed by an earlier test and the tap that expects it lands on a product
tile instead. The cart badge assertions fail the same way: the cart already has
two items in it from whatever ran before.

Our current answer is a teardown in each test that walks the UI back to a clean
state - tap the cart tab, remove every row, go back. It works right up until a
test fails in the middle, at which point the app is on some screen the teardown
does not expect, the teardown itself throws, and every test after it fails too.
One genuine failure turns into eighteen red tests and nobody reads past the
first one.

We have also seen the suite pass on a machine where the app happened to be
freshly installed and fail on the machine right next to it, which made us
distrust the results in general.

Session creation is in `tests/conftest.py`. The tests are otherwise fine.

## Output Specification

1. Make each test begin with the app in the state a user gets on a fresh
   install: no onboarding already dismissed, no cart contents, no cached login.
2. Cleanup performed by driving the UI is not acceptable. A test that fails
   halfway must not be able to break the tests that follow it.
3. No test may depend on another test having run first, in either direction.
4. Note the cost of whatever you choose, and offer the team a way to run a
   faster loop locally when they are iterating on a single test.
5. Do not weaken any assertion in `tests/test_cart.py`; the flow it covers must
   still be covered.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
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

=============== FILE: tests/test_cart.py ===============
import pytest


def _clean_up(driver):
    driver.find_element("accessibility id", "cart-tab").click()
    while driver.find_elements("accessibility id", "remove-item-0"):
        driver.find_element("accessibility id", "remove-item-0").click()
    driver.find_element("accessibility id", "back").click()


@pytest.fixture(autouse=True)
def _teardown(driver):
    yield
    _clean_up(driver)


def test_adds_an_item(driver):
    driver.find_element("accessibility id", "skip-onboarding").click()
    driver.find_element("accessibility id", "product-0").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    assert driver.find_element("accessibility id", "cart-count").text == "1"


def test_adds_two_items(driver):
    driver.find_element("accessibility id", "skip-onboarding").click()
    driver.find_element("accessibility id", "product-0").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    driver.find_element("accessibility id", "back").click()
    driver.find_element("accessibility id", "product-1").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    assert driver.find_element("accessibility id", "cart-count").text == "2"


def test_removes_the_last_item(driver):
    driver.find_element("accessibility id", "skip-onboarding").click()
    driver.find_element("accessibility id", "product-0").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    driver.find_element("accessibility id", "cart-tab").click()
    driver.find_element("accessibility id", "remove-item-0").click()
    assert driver.find_element("accessibility id", "cart-count").text == "0"
