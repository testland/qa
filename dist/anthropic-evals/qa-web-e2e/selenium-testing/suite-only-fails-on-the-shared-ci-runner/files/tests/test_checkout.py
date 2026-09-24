from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .helpers import sign_in, open_cart


def test_place_order(driver, base_url):
    sign_in(driver, base_url)
    driver.get(f"{base_url}/checkout?cart=seeded")

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid=place-order]"))
    ).click()

    WebDriverWait(driver, 10).until(EC.url_contains("/orders/"))
    assert "Thank you" in driver.find_element(
        By.CSS_SELECTOR, "[data-testid=order-confirmation]"
    ).text


def test_apply_promo(driver, base_url):
    sign_in(driver, base_url)
    open_cart(driver, base_url)
    driver.find_element(By.CSS_SELECTOR, "[data-testid=promo-code]").send_keys("SPRING10")

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid=apply-promo]"))
    ).click()

    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=order-total]"))
    )
    assert driver.find_element(By.CSS_SELECTOR, "[data-testid=order-total]").text == "44.91"


def test_guest_checkout_requires_an_email(base_url):
    # its own browser, so a signed-in session from another test cannot leak in
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    d = webdriver.Chrome(options=options)

    d.get(f"{base_url}/checkout?guest=1")
    WebDriverWait(d, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid=place-order]"))
    ).click()

    error = WebDriverWait(d, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=guest-email-error]"))
    )
    assert "email" in error.text.lower()
    d.quit()
