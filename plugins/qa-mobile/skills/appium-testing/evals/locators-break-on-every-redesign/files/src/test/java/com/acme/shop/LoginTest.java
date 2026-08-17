package com.acme.shop;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.AppiumDriver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginTest extends BaseMobileTest {

    @Test
    void rejectsABadPassword() {
        AppiumDriver driver = driver();
        driver.findElement(AppiumBy.accessibilityId("email-field")).sendKeys("a@b.c");
        driver.findElement(AppiumBy.accessibilityId("password-field")).sendKeys("nope");
        driver.findElement(AppiumBy.accessibilityId("sign-in")).click();
        assertTrue(driver.findElement(AppiumBy.accessibilityId("login-error")).isDisplayed());
    }
}
