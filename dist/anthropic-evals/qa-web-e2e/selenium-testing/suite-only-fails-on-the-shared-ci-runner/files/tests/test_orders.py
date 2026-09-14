from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .helpers import sign_in


def test_order_history_lists_past_orders(driver, base_url):
    sign_in(driver, base_url)
    driver.get(f"{base_url}/orders")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=order-row]"))
    )
    assert len(driver.find_elements(By.CSS_SELECTOR, "[data-testid=order-row]")) == 6


def test_reorder_puts_the_previous_lines_back_in_the_cart(driver, base_url):
    sign_in(driver, base_url)
    driver.get(f"{base_url}/orders/1042")

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid=reorder]"))
    ).click()

    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.CSS_SELECTOR, "[data-testid=cart-count]"), "3")
    )
    assert driver.find_element(By.CSS_SELECTOR, "[data-testid=cart-count]").text == "3"
