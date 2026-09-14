from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .helpers import sign_in, open_cart


def test_place_order(driver, base_url):
    sign_in(driver, base_url)
    open_cart(driver, base_url)
    driver.get(f"{base_url}/checkout")

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "place-order"))
    ).click()

    WebDriverWait(driver, 10).until(EC.url_contains("/orders/"))
    assert "Thank you" in driver.find_element(By.ID, "confirmation").text


def test_apply_promo(base_url):
    # a clean session so a promo from another test cannot bleed into this one
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options)

    sign_in(driver, base_url)
    open_cart(driver, base_url)
    driver.find_element(By.ID, "promo-code").send_keys("SPRING10")

    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.ID, "apply-promo"))
    ).click()

    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.ID, "order-total"), "44.91")
    )
    driver.quit()


def test_guest_checkout_requires_an_email(base_url):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options)

    driver.get(f"{base_url}/checkout?guest=1")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "place-order"))
    ).click()

    error = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=guest-email-error]"))
    )
    assert "email" in error.text.lower()
    driver.quit()
