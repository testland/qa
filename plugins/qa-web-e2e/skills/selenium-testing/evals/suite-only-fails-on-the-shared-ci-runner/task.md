# Green on every laptop, red one run in three on the shared runner

## Problem Description

Our browser suite is 11 tests. It passes on every developer machine, every time,
and it has done for a year. On the shared runner it goes red on roughly one run
in three, and it is never the same test twice running — last week it was
`test_apply_promo` on Monday, `test_guest_checkout_requires_an_email` on
Wednesday, and both on Thursday night. I have attached the console output from a
red run on 2026-09-08 and a green one on 2026-09-10 so you can see the difference
for yourself, because I cannot.

Two things I am confident about, for what it is worth:

- Every test gets a clean browser. Dmitri set that up when we moved to the shared
  runner last year and I have never had reason to doubt it.
- There are no fixed waits left anywhere in this suite. We took the last of them
  out in November. Every wait is an explicit one with a ten-second budget.

On a laptop people just run `pytest`. On the runner it runs whatever is in the
job file, which is also attached.

I have three decisions to make by Friday and a finance review to survive.

1. **Take every wait from ten seconds to sixty.** The runner is shared with two
   other teams and it is plainly slower than a laptop, so ten seconds is probably
   just too tight for it. Costs nothing but wall-clock.
2. **Move the job to the 16 GB runner class.** We are seeing the browser fall
   over on that box and the obvious reading is that it has run out of room.
   £812 per runner per month, three runners.
3. **Ops have offered one change to the container the job runs in**, at no cost
   to us. They sent their notes rather than a recommendation, and they want a
   yes or a no from our side rather than making the call themselves.

For each one: do it or don't, and the reason. And I need the actual mechanism
behind each of the two symptoms — the failures that move around, and the browser
falling over — not a general tidy-up. Finance will ask me why, and "it was
flaky" is not an answer that survives that room.

## Output Specification

1. Edit the test files in place. Do not delete a test.
2. Write `docs/ci-suite-diagnosis.md`. Answer the three decisions explicitly and
   separately, and give the mechanism behind each of the two symptoms, citing the
   file and line you read it from.
3. Leave `tests/test_api_health.py` alone — it has nothing to do with any of this.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/conftest.py ===============
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

=============== FILE: tests/helpers.py ===============
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

=============== FILE: tests/test_checkout.py ===============
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

=============== FILE: tests/test_orders.py ===============
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

=============== FILE: tests/test_catalog.py ===============
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

=============== FILE: tests/test_api_health.py ===============
import requests

BASE_URL = "http://localhost:3000"


def test_health_endpoint_is_up():
    r = requests.get(f"{BASE_URL}/healthz", timeout=5)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_version_endpoint_reports_a_build():
    r = requests.get(f"{BASE_URL}/version", timeout=5)
    assert r.status_code == 200
    assert r.json()["build"]


def test_catalog_api_returns_products():
    r = requests.get(f"{BASE_URL}/api/products", timeout=5)
    assert r.status_code == 200
    assert len(r.json()["items"]) == 24

=============== FILE: ci/e2e-job.yml ===============
name: e2e

on:
  schedule: [{ cron: '0 2 * * *' }]
  pull_request:

jobs:
  e2e:
    runs-on: [self-hosted, ci-shared-02]
    container:
      image: ghcr.io/shop/e2e-runner:2026.08
    steps:
      - uses: actions/checkout@v5
      - run: docker compose up -d --wait
      - run: pip install -r requirements.txt
      - name: run the suite
        run: pytest -n 4 --dist load tests/ --junitxml=reports/junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit
          path: reports/

=============== FILE: ci/run-2026-09-08-red.txt ===============
$ pytest -n 4 --dist load tests/ --junitxml=reports/junit.xml
============================= test session starts ==============================
platform linux -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0
plugins: xdist-3.6.1
4 workers [11 items]

[gw1] [  9%] PASSED tests/test_api_health.py::test_health_endpoint_is_up
[gw3] [ 18%] PASSED tests/test_catalog.py::test_catalog_lists_products
[gw1] [ 27%] PASSED tests/test_api_health.py::test_version_endpoint_reports_a_build
[gw2] [ 36%] PASSED tests/test_orders.py::test_reorder_puts_the_previous_lines_back_in_the_cart
[gw1] [ 45%] PASSED tests/test_api_health.py::test_catalog_api_returns_products
[gw3] [ 54%] PASSED tests/test_catalog.py::test_search_narrows_the_catalog
[gw0] [ 63%] PASSED tests/test_orders.py::test_order_history_lists_past_orders
[gw2] [ 72%] FAILED tests/test_checkout.py::test_apply_promo
[gw3] [ 81%] PASSED tests/test_catalog.py::test_product_page_shows_stock
[gw0] [ 90%] PASSED tests/test_checkout.py::test_place_order
[gw0] [100%] FAILED tests/test_checkout.py::test_guest_checkout_requires_an_email

=================================== FAILURES ===================================
_________________________________ test_apply_promo _____________________________
[gw2] linux -- Python 3.12.7

    assert driver.find_element(By.CSS_SELECTOR, "[data-testid=order-total]").text == "44.91"
E   AssertionError: assert '71.38' == '44.91'
E     - 44.91
E     + 71.38

tests/test_checkout.py:34: AssertionError
_____________________ test_guest_checkout_requires_an_email ____________________
[gw0] linux -- Python 3.12.7

    d = webdriver.Chrome(options=options)
E   selenium.common.exceptions.WebDriverException: Message: unknown error:
E   session deleted because of page crash
E   from tab crashed
E     (Session info: chrome=141.0.7390.65)

tests/test_checkout.py:43: WebDriverException
=========================== short test summary info ============================
FAILED tests/test_checkout.py::test_apply_promo - AssertionError: assert '71.38' == '44.91'
FAILED tests/test_checkout.py::test_guest_checkout_requires_an_email - WebDriverException
========================= 2 failed, 9 passed in 241.60s ========================

=============== FILE: ci/run-2026-09-10-green.txt ===============
$ pytest -n 4 --dist load tests/ --junitxml=reports/junit.xml
============================= test session starts ==============================
platform linux -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0
plugins: xdist-3.6.1
4 workers [11 items]

[gw0] [  9%] PASSED tests/test_catalog.py::test_catalog_lists_products
[gw2] [ 18%] PASSED tests/test_api_health.py::test_health_endpoint_is_up
[gw1] [ 27%] PASSED tests/test_checkout.py::test_apply_promo
[gw2] [ 36%] PASSED tests/test_api_health.py::test_version_endpoint_reports_a_build
[gw3] [ 45%] PASSED tests/test_orders.py::test_reorder_puts_the_previous_lines_back_in_the_cart
[gw0] [ 54%] PASSED tests/test_catalog.py::test_search_narrows_the_catalog
[gw2] [ 63%] PASSED tests/test_api_health.py::test_catalog_api_returns_products
[gw1] [ 72%] PASSED tests/test_checkout.py::test_place_order
[gw0] [ 81%] PASSED tests/test_catalog.py::test_product_page_shows_stock
[gw3] [ 90%] PASSED tests/test_orders.py::test_order_history_lists_past_orders
[gw1] [100%] PASSED tests/test_checkout.py::test_guest_checkout_requires_an_email

========================= 11 passed in 236.04s =================================

=============== FILE: ci/ops-notes.md ===============
# ci-shared-02, notes for the e2e job

Written 2026-09-09 by platform ops. We are not going to tell you what to do with
the suite; these are the measurements you asked for.

## Host memory during the 2026-09-08 run

`free -m` sampled every 30 s for the whole run. Peak line:

```
              total        used        free      shared  buff/cache   available
Mem:           7982        3106        1204        2044        3672        4590
```

The box has never gone into swap. The host has 8 GB.

## Inside the job container, same run

```
$ docker exec ci-e2e-runner df -h /dev/shm
Filesystem      Size  Used Avail Use% Mounted on
shm              64M   64M     0 100% /dev/shm
```

That is what the container was given when it was created; nothing in our job
definition sets it. We can put any value we like on that container — it is one
line in the job definition and it costs nothing, but we are not going to change
it on a hunch, so tell us whether it is worth doing.

## Pricing, since you asked

The 16 GB runner class is £812 per runner per month. You have three runners.
That is a purchase order and a month of lead time.

## One more thing

ci-shared-01 runs the API suite only and has never raised any of this. Same
image, same host class, same container settings.
