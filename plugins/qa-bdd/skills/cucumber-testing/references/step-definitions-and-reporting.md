# Cucumber step definitions and reporting

Full step-definition and JUnit XML reporting examples for
[cucumber-testing](../SKILL.md) (Steps 5 and 7). The Gherkin feature they bind
to is in Step 4 of the SKILL.md.

## Step definitions - JVM (Java)

```java
import io.cucumber.java.en.*;

public class CheckoutSteps {

    private Cart cart;
    private CheckoutPage page;

    @Given("a logged-in user with email confirmed")
    public void a_logged_in_user() {
        TestUser user = TestUsers.loggedInWithEmailConfirmed();
        page = new CheckoutPage().loginAs(user);
    }

    @Given("the cart contains {int} of {string} at ${double}")
    public void the_cart_contains(int qty, String sku, double price) {
        cart = new Cart();
        cart.addItem(new Item(sku, qty, price));
        page.setCart(cart);
    }

    @When("I enter {string} in the promo input")
    public void i_enter(String code) {
        page.enterPromo(code);
    }

    @When("I click {string}")
    public void i_click(String label) {
        page.click(label);
    }

    @Then("the subtotal updates to ${double}")
    public void the_subtotal_updates(double expected) {
        assertEquals(expected, page.getSubtotal(), 0.01);
    }
}
```

## Step definitions - JS

```javascript
const { Given, When, Then } = require('@cucumber/cucumber');

Given('a logged-in user with email confirmed', function() {
  this.user = createLoggedInUser();
  this.page = new CheckoutPage(this.user);
});

When('I enter {string} in the promo input', function(code) {
  this.page.enterPromo(code);
});

Then('the subtotal updates to ${float}', function(expected) {
  assert.equal(this.page.getSubtotal(), expected);
});
```

## Reporting

Cucumber outputs to multiple formats; JUnit XML is the CI-canonical one.

JVM (in `cucumber.properties`):

```properties
cucumber.plugin=pretty,html:target/cucumber-report.html,junit:target/cucumber-report.xml
```

JS (CLI):

```bash
npx cucumber-js features/ \
  --format html:reports/cucumber.html \
  --format junit:reports/cucumber.xml
```

The JUnit XML feeds `junit-xml-analysis` (in the qa-test-reporting plugin).
