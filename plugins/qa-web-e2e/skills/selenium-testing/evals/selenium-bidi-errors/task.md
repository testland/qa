# Fail every test when the page throws a JavaScript error

## Problem Description

We want every test to fail when the page throws a JavaScript error, on Chrome and Firefox via Selenium Grid (`docs/goal.md`). Rewrite `BaseTest.java`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/test/java/shop/BaseTest.java ===============
package shop;

import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.devtools.v142.log.Log;
import java.util.*;

public abstract class BaseTest {
    protected WebDriver driver;
    protected final List<String> jsErrors = new ArrayList<>();

    @BeforeEach void startBrowser() {
        ChromeDriver chrome = new ChromeDriver();
        DevTools devTools = chrome.getDevTools();
        devTools.createSession();
        devTools.send(Log.enable());
        devTools.addListener(Log.entryAdded(), e -> { if (e.getLevel().toString().equals("error")) jsErrors.add(e.getText()); });
        driver = chrome;
    }

    @AfterEach void stopBrowser() { driver.quit(); }
}

=============== FILE: docs/goal.md ===============
We are moving the suite to Selenium Grid 4 (RemoteWebDriver) with Chrome and Firefox nodes.
Goal: every test fails if the page throws an uncaught JavaScript error, on both browsers.
Our listener only works on local Chrome, and nothing fails the test today: errors are collected and ignored.
