package com.atlas.e2e.support;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public final class Browser {

    private Browser() {
    }

    public static WebDriver create(ChromeOptions options) {
        return new ChromeDriver(options);
    }
}
