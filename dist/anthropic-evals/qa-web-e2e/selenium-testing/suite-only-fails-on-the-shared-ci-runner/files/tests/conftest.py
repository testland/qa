import pytest
from selenium import webdriver

BASE_URL = "http://localhost:3000"


@pytest.fixture(scope="session")
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,900")
    d = webdriver.Chrome(options=options)
    yield d
    d.quit()


@pytest.fixture
def base_url():
    return BASE_URL
