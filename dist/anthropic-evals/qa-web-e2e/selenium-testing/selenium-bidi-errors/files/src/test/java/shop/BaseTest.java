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
