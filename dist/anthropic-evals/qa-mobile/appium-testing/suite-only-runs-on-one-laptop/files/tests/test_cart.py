def test_adds_an_item(driver):
    driver.find_element("accessibility id", "product-0").click()
    driver.find_element("accessibility id", "add-to-cart").click()
    assert driver.find_element("accessibility id", "cart-count").text == "1"


def test_removes_the_last_item(driver):
    driver.find_element("accessibility id", "cart-tab").click()
    driver.find_element("accessibility id", "remove-item-0").click()
    assert driver.find_element("accessibility id", "cart-count").text == "0"
