import os
import time

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    d = webdriver.Remote(command_executor=os.environ["GRID_URL"], options=options)
    yield d
    d.quit()


def test_partner_can_export_settlement_csv(driver):
    driver.get(os.environ["PARTNER_BASE_URL"] + "/settlements")
    driver.find_element(By.ID, "export").click()
    time.sleep(5)
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-status=ready]"))
    )
    assert "settlements-2026-08.csv" in driver.find_element(By.ID, "download").text


def test_a_partner_cannot_see_another_partners_settlements(driver):
    driver.get(os.environ["PARTNER_BASE_URL"] + "/settlements/ptr_8890")
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-error=forbidden]"))
    )
