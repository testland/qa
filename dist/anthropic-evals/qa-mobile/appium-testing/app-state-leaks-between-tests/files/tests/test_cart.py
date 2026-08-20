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
