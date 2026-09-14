from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_catalog_lists_products(driver, base_url):
    driver.get(f"{base_url}/products")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=product-grid]"))
    )
    assert len(driver.find_elements(By.CSS_SELECTOR, "[data-testid=product-card]")) == 24


def test_search_narrows_the_catalog(driver, base_url):
    driver.get(f"{base_url}/products")
    box = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid=search]"))
    )
    box.send_keys("ceramic")
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, "[data-testid=result-count]"), "3 results"
        )
    )


def test_product_page_shows_stock(driver, base_url):
    driver.get(f"{base_url}/products/BOOK-001")
    stock = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=stock]"))
    )
    assert "In stock" in stock.text
