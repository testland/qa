import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def sign_in(driver, base_url, email="buyer@example.com", password="test-password"):
    driver.get(f"{base_url}/login")
    driver.find_element(By.CSS_SELECTOR, "[data-testid=email]").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "[data-testid=password]").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=account-menu]"))
    )


def open_cart(driver, base_url):
    driver.get(f"{base_url}/cart")
    time.sleep(3)
    return driver.find_element(By.CSS_SELECTOR, "[data-testid=cart-lines]")
