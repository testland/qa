package com.shop.e2e;

import com.shop.pages.PaymentPage;
import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

class PaymentTest extends PaymentPage {

    @Test
    void paysWithAValidCard() {
        driver.get(BASE + "/checkout?cart=seeded");
        enterCard("4242424242424242", "12/29", "123");
        saveCardForNextTime();
        pay();
        wait.until(ExpectedConditions.urlContains("/orders/"));
        Assertions.assertTrue(
                driver.findElement(By.cssSelector("[data-testid=order-confirmation]"))
                      .getText().contains("Thank you"));
    }

    @Test
    void reportsADeclinedCard() {
        driver.get(BASE + "/checkout?cart=seeded");
        enterCard("4000000000000002", "12/29", "123");
        pay();
        Assertions.assertTrue(errorText().contains("declined"));
    }

    @Test
    void refusesAnExpiredCard() {
        driver.get(BASE + "/checkout?cart=seeded");
        enterCard("4242424242424242", "01/20", "123");
        pay();
        Assertions.assertTrue(errorText().contains("expired"));
    }
}
