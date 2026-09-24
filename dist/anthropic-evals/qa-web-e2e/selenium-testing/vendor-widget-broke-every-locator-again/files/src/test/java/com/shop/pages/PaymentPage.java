package com.shop.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class PaymentPage extends BasePage {

    // vendor widget - class names come out of their build, update when they ship
    private static final By CARD_NUMBER = By.className("pw-input_7d31e4");
    private static final By EXPIRY = By.xpath("/html/body/div[3]/form/input[2]");
    private static final By CVC = By.xpath("/html/body/div[3]/form/input[3]");
    private static final By SAVE_CARD = By.className("pw-box_8812cd");
    private static final By PAY = By.className("pw-submit_0a91fe");
    private static final By ERROR = By.className("pw-error_19bb77");

    public void enterCard(String number, String expiry, String cvc) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(CARD_NUMBER)).sendKeys(number);
        driver.findElement(EXPIRY).sendKeys(expiry);
        driver.findElement(CVC).sendKeys(cvc);
    }

    public void saveCardForNextTime() {
        driver.findElement(SAVE_CARD).click();
    }

    public void pay() {
        wait.until(ExpectedConditions.elementToBeClickable(PAY)).click();
    }

    public String errorText() {
        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(ERROR));
        return error.getText();
    }
}
