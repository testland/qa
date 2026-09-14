import pytest
from selenium import webdriver

BASE_URL = "http://localhost:3000"


@pytest.fixture(scope="session")
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    d = webdriver.Chrome(options=options)
    d.set_window_size(1440, 900)
    yield d
    d.quit()


@pytest.fixture
def base_url():
    return BASE_URL
