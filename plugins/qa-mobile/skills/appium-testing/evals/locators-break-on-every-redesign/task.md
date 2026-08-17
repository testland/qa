# Every UI tweak breaks fourteen mobile tests

## Problem Description

Our Java mobile suite breaks on almost every design change. Last release the
copy team changed "Add to cart" to "Add to bag" and fourteen tests went red
without a single behaviour change. The release before that, someone wrapped a
screen in an extra container view and the tests broke again, because several
lookups walk the whole view tree from the root.

Every element also needs two lookups, one per platform, chosen by a conditional
in the test. So the same element is described twice, in two syntaxes, and a
change on one platform leaves the other silently untouched.

The lookups themselves are also slow - on iOS the suite spends noticeably
longer finding elements than doing anything else with them.

We can get changes into both apps. The mobile teams will do it if we tell them
exactly what to add and where; "add test IDs" got us nowhere last time because
neither team knew what that meant on their platform.

## Output Specification

1. Rewrite the element lookups in `src/test/java/com/acme/shop/CartTest.java`
   so that renaming a label or nesting a screen in another container does not
   break them, and so that each element is described once for both platforms
   rather than once per platform.
2. Deliver `docs/app-instrumentation.md`: a checklist the iOS team and the
   Android team can each act on without asking follow-up questions. For each
   element the test touches, state the value to attach and name the exact
   platform-native attribute each team must set, with a short snippet in each
   platform's own app code.
3. The assertions must keep their current meaning. This is a locator change,
   not a coverage change.
4. Do not modify `src/test/java/com/acme/shop/LoginTest.java`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/acme/shop/CartTest.java ===============
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

=============== FILE: src/test/java/com/acme/shop/LoginTest.java ===============
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
