from helpers.mailbox import wait_for_code


def test_signs_in_with_a_one_time_code(driver):
    driver.find_element("accessibility id", "email-field").send_keys("qa+otp@acme.test")
    driver.find_element("accessibility id", "send-code").click()

    # blocks until the mailbox has the message; 40s on a good day, 90s+ on a bad one
    code = wait_for_code("qa+otp@acme.test", timeout=180)

    driver.find_element("accessibility id", "code-field").send_keys(code)
    driver.find_element("accessibility id", "verify").click()
    assert driver.find_element("accessibility id", "account-home").is_displayed()
