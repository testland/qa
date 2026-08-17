package com.acme.shop;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.AppiumDriver;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CartTest extends BaseMobileTest {

    private WebElement addToCart(AppiumDriver driver) {
        if (isIos()) {
            return driver.findElement(
                AppiumBy.xpath("//XCUIElementTypeButton[@name='Add to cart']"));
        }
        return driver.findElement(
            AppiumBy.xpath("//android.widget.Button[@text='Add to cart']"));
    }

    private WebElement cartBadge(AppiumDriver driver) {
        if (isIos()) {
            return driver.findElement(AppiumBy.xpath(
                "//XCUIElementTypeApplication/XCUIElementTypeWindow"
                    + "/XCUIElementTypeOther/XCUIElementTypeStaticText[2]"));
        }
        return driver.findElement(AppiumBy.xpath(
            "/hierarchy/android.widget.FrameLayout/android.view.ViewGroup"
                + "/android.widget.TextView[1]"));
    }

    @Test
    void addingAnItemUpdatesTheBadge() {
        AppiumDriver driver = driver();

        driver.findElement(isIos()
            ? AppiumBy.xpath("//XCUIElementTypeCell[1]")
            : AppiumBy.xpath("//androidx.recyclerview.widget.RecyclerView/android.view.ViewGroup[1]"))
            .click();

        addToCart(driver).click();

        assertEquals("1", cartBadge(driver).getText());
    }

    @Test
    void removingTheLastItemEmptiesTheBadge() {
        AppiumDriver driver = driver();

        driver.findElement(isIos()
            ? AppiumBy.xpath("//XCUIElementTypeButton[@name='Cart']")
            : AppiumBy.xpath("//android.widget.Button[@text='Cart']"))
            .click();

        driver.findElement(isIos()
            ? AppiumBy.xpath("//XCUIElementTypeButton[@name='Remove']")
            : AppiumBy.xpath("//android.widget.Button[@text='Remove']"))
            .click();

        assertEquals("0", cartBadge(driver).getText());
    }
}
