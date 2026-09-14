# Green on every laptop, red one run in three on the shared runner

## Problem Description

Our browser suite is 11 tests. It passes on every developer machine, every time.
On the shared CI runner it has failed on roughly one run in three since the
middle of July, and it is never the same test twice in a row — last week it was
`test_place_order` on Monday, `test_apply_promo` on Wednesday, and both on
Thursday night.

Two more facts that may or may not belong in the same story:

- Ops has been paging on memory on that runner since 2026-08-02. They sent over
  a process listing they grabbed on 2026-09-08, an hour after a red run. It is
  in the files.
- We cleaned all the fixed waits out of this suite in November last year. Every
  wait in here is an explicit one with a ten-second budget. That was supposed to
  be the end of this class of problem and it clearly wasn't.

I have two changes queued up and about eight hundred pounds a month of runner
budget riding on the second one:

1. Take the explicit wait budget from ten seconds to sixty. The runner is shared
   with two other teams and it is plainly slower than a laptop, so ten seconds
   is probably just too tight for it.
2. Move the job to the 16 GB runner class, since we are paging on memory.

Tell me whether each of those is the right call before I spend anything. If they
are not, I need the actual mechanism for each symptom, not a general tidy-up —
I have to justify this to a finance review on Friday.

Aarti from the front-end team wrote up how the checkout page is put together
after the second failure; her notes are attached.

## Output Specification

1. Edit the test files in place. Do not delete a test.
2. Write `docs/ci-suite-diagnosis.md`. Answer both of my proposed changes
   explicitly and separately — for each one, do it or don't, and the reason —
   and give the mechanism behind each of the two symptoms (the intermittent
   failures, and the memory pressure), citing the file and line you read it
   from.
3. Anything you did not need to change, leave exactly as it is.

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
    d = webdriver.Chrome(options=options)
    d.set_window_size(1440, 900)
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
        EC.text_to_be_present_in_element((By.CSS_SELECTOR, "[data-testid=result-count]"), "3 results")
    )

=============== FILE: app-notes/checkout-markup.md ===============
# How the checkout and cart pages are put together

Written up after the 2026-09-04 red run, since two people asked.

Both pages render their action buttons immediately, in the disabled state, and
enable them from JavaScript once the relevant request comes back:

```html
<!-- /checkout, first paint -->
<button id="place-order" class="btn primary" disabled>Place order</button>
```

- `#place-order` is enabled when `POST /api/cart/totals` resolves. On my machine
  that is 60-120 ms. It is not lazy-rendered and it is not hidden; it is in the
  DOM and on screen from first paint, greyed out.
- `#apply-promo` on `/cart` behaves the same way: present and visible from first
  paint, enabled when `GET /api/cart` resolves.
- Clicking either one while it is still disabled does nothing at all. No
  navigation, no request, no console error — the browser does not dispatch the
  click to a disabled control.
- The confirmation heading `#confirmation` only exists after the order posts.

Nothing here changed in July. The totals endpoint has been the slowest thing on
the page since we shipped it in February.

=============== FILE: ci/failure-excerpt.txt ===============
============================= test session starts ==============================
platform linux -- Python 3.12.7, pytest-8.3.3, pluggy-1.5.0
collected 11 items

tests/test_catalog.py ..                                                 [ 18%]
tests/test_checkout.py F.F                                               [ 45%]
tests/test_orders.py .....                                               [ 90%]
tests/test_profile.py .                                                  [100%]

=================================== FAILURES ===================================
________________________________ test_place_order _______________________________

    WebDriverWait(driver, 10).until(EC.url_contains("/orders/"))
E   selenium.common.exceptions.TimeoutException: Message:
E   Stacktrace:
E   #0 0x5581e1c8a9e3 <unknown>

tests/test_checkout.py:18: TimeoutException
_____________________ test_guest_checkout_requires_an_email ____________________

    error = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid=guest-email-error]"))
    )
E   selenium.common.exceptions.TimeoutException: Message:
E   Stacktrace:
E   #0 0x5581e1c8a9e3 <unknown>

tests/test_checkout.py:52: TimeoutException
=========================== short test summary info ============================
FAILED tests/test_checkout.py::test_place_order - TimeoutException
FAILED tests/test_checkout.py::test_guest_checkout_requires_an_email - TimeoutException
========================= 2 failed, 9 passed in 214.11s ========================

=============== FILE: ci/runner-alerts.md ===============
# ci-shared-02 memory

Alert `runner-mem-high` has fired 23 times since 2026-08-02. It clears after a
reboot and comes back within a week or so. It has never fired on ci-shared-01,
which runs the API suite only.

Process listing taken 2026-09-08 at 04:17, about an hour after the nightly run
finished:

```
$ ps -eo pid,etimes,rss,comm --sort=-rss | head -20
    PID ETIMES   RSS COMMAND
  30412  61104 412996 chrome
  28877 152311 401220 chrome
  27140 238902 398764 chrome
  24903 325488 396112 chrome
  22661 411901 394008 chrome
  20330 498377 391556 chrome
  18096 584799 388904 chrome
  15854 671210 386332 chrome
  13611 757612 383780 chrome
  11388 844044 381104 chrome
   9145 930455 378552 chrome
   6902 1016866 375900 chrome
   4670 1103288 373348 chrome
```

```
$ pgrep -c chrome
47
```

Uptime on the box at the time of the listing was 14 days.
