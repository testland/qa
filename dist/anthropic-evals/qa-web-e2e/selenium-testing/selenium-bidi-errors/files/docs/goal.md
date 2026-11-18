We are moving the suite to Selenium Grid 4 (RemoteWebDriver) with Chrome and Firefox nodes.
Goal: every test fails if the page throws an uncaught JavaScript error, on both browsers.
Our listener only works on local Chrome, and nothing fails the test today: errors are collected and ignored.
