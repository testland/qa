package com.atlas.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

class DashboardTest extends BaseTest {

    @Test
    void showsTheOpenTicketCount() {
        driver.get(BASE + "/dashboard");
        WebElement count = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=open-tickets]")));
        Assertions.assertEquals("17", count.getText());
    }

    @Test
    void filtersTicketsByQueue() {
        driver.get(BASE + "/dashboard");
        wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=queue-billing]"))).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector("[data-testid=result-count]"), "4 tickets"));
    }
}
