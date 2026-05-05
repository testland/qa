---
name: cucumber-testing
description: Configures Cucumber for BDD scenarios — Cucumber-JVM (Java/Kotlin via JUnit 5), Cucumber-JS (Node), Cucumber-Ruby. Authors `.feature` files in Gherkin, writes step definitions in the host language, runs via the framework's runner, integrates with JUnit XML reporting. Use as the canonical Cucumber wrapper for any of the three official implementations.
rating: 23
d6: 4
archetype: S1
---

# cucumber-testing

## Overview

Per [cucumber-install][ci]:

[ci]: https://cucumber.io/docs/installation/

> "Cucumber is available for most mainstream programming
> languages."

Cucumber implementations split into tiers ([cucumber-install][ci]):

> - **Official**: Hosted under the main Cucumber organization
>   (JavaScript, Java, Ruby, Android, Kotlin, Scala, C++)
> - **Semi-official**: Developed elsewhere but use Cucumber
>   components (PHP's Behat, Python's Behave, .NET's Reqnroll)

This skill covers the three most-used official implementations:
**Cucumber-JVM** (Java + Kotlin), **Cucumber-JS** (Node), and
**Cucumber-Ruby**. For Python, see
[`behave-testing`](../behave-testing/SKILL.md). For .NET, see
[`reqnroll-testing`](../reqnroll-testing/SKILL.md).

## When to use

- The team uses BDD with Gherkin features.
- Cross-stakeholder collaboration is the value (Gherkin scenarios
  read by non-engineers).
- Acceptance criteria authored as Gherkin scenarios per
  [`acceptance-criteria-extractor`](../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md).

If only engineers will read the tests, BDD's collaboration value
is wasted — plain xUnit-style tests are simpler.

## Step 1 — Install (Cucumber-JVM)

Maven:

```xml
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-java</artifactId>
  <version>7.20.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-junit-platform-engine</artifactId>
  <version>7.20.0</version>
  <scope>test</scope>
</dependency>
```

For Kotlin: replace `cucumber-java` with `cucumber-kotlin`.

## Step 2 — Install (Cucumber-JS)

```bash
npm install --save-dev @cucumber/cucumber
```

## Step 3 — Install (Cucumber-Ruby)

```bash
gem install cucumber
# Or in Gemfile:
group :test do
  gem 'cucumber-ruby'
end
```

## Step 4 — Author a Feature

```gherkin
# features/cart.feature
Feature: Apply promo code at checkout

  Background:
    Given a logged-in user with email confirmed
    And the cart contains 1 of "BOOK-001" at $24.99

  Scenario: Apply valid promo
    When I enter "WELCOME10" in the promo input
    And I click "Apply"
    Then the subtotal updates to $22.49
    And a confirmation toast appears

  Scenario Outline: Promo validation rejects bad codes
    When I enter "<code>" in the promo input
    And I click "Apply"
    Then an error appears: "<error>"

    Examples:
      | code         | error                    |
      | EXPIRED50    | This code has expired    |
      | NOTREAL      | Code not found           |
      | "" (empty)   | Please enter a code      |
```

## Step 5 — Write step definitions

### JVM (Java)

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

### JS

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

## Step 6 — Run

JVM (via Maven):

```bash
mvn test
# Or specific feature:
mvn test -Dcucumber.features=features/cart.feature
```

JS:

```bash
npx cucumber-js features/
```

Ruby:

```bash
cucumber features/
```

## Step 7 — Reporting

Cucumber outputs to multiple formats; JUnit XML is the
CI-canonical:

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

The JUnit XML feeds [`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Step 8 — Tags + filtering

```gherkin
@regression @critical
Scenario: Apply valid promo
  ...
```

```bash
# Run only critical tests
npx cucumber-js features/ --tags '@critical'

# Skip @wip
npx cucumber-js features/ --tags 'not @wip'
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Imperative steps ("I click button id=#submit")                        | Couples to implementation; scenarios become fragile.                     | Declarative steps ("I submit the form") (see [`gherkin-style-reviewer`](../../agents/gherkin-style-reviewer.md)). |
| 100 unique step definitions                                            | Drift; inconsistency.                                                     | Step library curation (see [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md)). |
| BDD without business stakeholder involvement                            | Defeats the point; expensive xUnit tests.                                | If non-engineers don't read the features, switch to plain unit tests. |
| Mixing Cucumber + plain JUnit assertions                                | Two test runners; double maintenance.                                    | Cucumber's runner only; plain JUnit for non-BDD tests in separate suite. |
| Skipping `Background` for shared setup                                  | Repeated Given lines clutter scenarios.                                  | Background block (Step 4 example). |

## Limitations

- **Step ambiguity.** Two step definitions matching the same
  Gherkin line cause runtime errors; the framework reports
  ambiguous steps but only at runtime.
- **Per-language quirks.** Cucumber-JVM's regex syntax differs
  from Cucumber-JS's; copy-paste between languages doesn't work.
- **Performance.** BDD adds runner overhead vs plain xUnit;
  acceptable for <500-test suites, slow beyond.
- **Step-definition discoverability.** Without IDE plugin, finding
  the implementation behind a Gherkin line is manual grep.

## References

- [ci][ci] — Cucumber installation: official + semi-official + unofficial
  implementation tiers; recommendation to match production language.
- [`behave-testing`](../behave-testing/SKILL.md) — Python sibling.
- [`reqnroll-testing`](../reqnroll-testing/SKILL.md) — .NET sibling.
- [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md)
  — addresses step proliferation.
- [`gherkin-style-reviewer`](../../agents/gherkin-style-reviewer.md)
  — adversarial reviewer for declarative-vs-imperative.
- [`acceptance-criteria-extractor`](../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
  — upstream skill that generates Gherkin from stories.
