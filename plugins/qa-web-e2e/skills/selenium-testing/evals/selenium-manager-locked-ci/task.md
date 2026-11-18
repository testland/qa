# Selenium tests break whenever the CI image updates Chrome

## Problem Description

Our Selenium Java tests break whenever the CI image updates Chrome, and we have strict network rules (`BaseTest.java`, `docs/ci.md`). Fix the driver setup for CI using what Selenium provides.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/test/java/com/acme/BaseTest.java ===============
package com.acme;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.*;

public abstract class BaseTest {
  protected WebDriver driver;

  @BeforeEach
  void start() {
    System.setProperty("webdriver.chrome.driver", "/opt/drivers/chromedriver");  // pinned 128 in the CI image
    WebDriverManager.chromedriver().setup();
    ChromeOptions o = new ChromeOptions();
    o.addArguments("--headless=new");
    driver = new ChromeDriver(o);
  }

  @AfterEach
  void stop() { driver.quit(); }
}

=============== FILE: docs/ci.md ===============
- CI runners are behind the corporate proxy http://proxy.corp:3128 and have no internet access during the test
  stage (only the build stage can download). The browser itself must NOT use that proxy (it tests intranet apps).
- The runner image auto-updates Google Chrome; last week it moved to 131 and every job failed with
  "session not created: This version of ChromeDriver only supports Chrome version 128".
- QA signs off a release on one Chrome major version and wants tests on exactly that version (currently 131).
- Security: no usage data may leave the network.
- We're on Selenium 4.27.
