package com.atlas.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.nio.file.Paths;

class ReceiptUploadTest extends BaseTest {

    @Test
    void attachesAReceiptToAnExpense() {
        driver.get(BASE + "/expenses/new");
        driver.findElement(By.cssSelector("[data-testid=amount]")).sendKeys("42.00");

        driver.findElement(By.cssSelector("input[type=file]"))
              .sendKeys(Paths.get("src/test/resources/fixtures/receipt.pdf")
                             .toAbsolutePath().toString());

        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=attachment-name]")));
        Assertions.assertEquals("receipt.pdf",
                driver.findElement(By.cssSelector("[data-testid=attachment-name]")).getText());
    }
}
