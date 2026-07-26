# Selenium language bindings (Python, C#)

The Java + JUnit binding is the worked spine in `selenium-testing`.
Selenium ships official bindings for Python, JavaScript, C#, Ruby,
Kotlin, and PHP; the WebDriver calls map 1:1 across them. Two of the
most common non-Java bindings are shown below.

## Python (pytest)

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_checkout():
    driver = webdriver.Chrome()
    driver.get('http://localhost:3000/login')

    driver.find_element(By.CSS_SELECTOR, '[data-testid=email]').send_keys('user@example.com')
    driver.find_element(By.CSS_SELECTOR, '[data-testid=password]').send_keys('pwd')
    driver.find_element(By.CSS_SELECTOR, 'button[type=submit]').click()

    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Welcome')]"))
    )

    driver.quit()
```

## C# (xUnit)

```csharp
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using Xunit;

public class CheckoutTest : IDisposable
{
    private readonly IWebDriver driver = new ChromeDriver();
    private readonly WebDriverWait wait;

    public CheckoutTest()
    {
        wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void CompleteCheckout()
    {
        driver.Navigate().GoToUrl("http://localhost:3000/login");
        driver.FindElement(By.CssSelector("[data-testid=email]")).SendKeys("user@example.com");
        // ...
    }

    public void Dispose() => driver.Quit();
}
```
