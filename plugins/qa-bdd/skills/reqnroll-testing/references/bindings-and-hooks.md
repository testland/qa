# Reqnroll step bindings and hooks

Full step-binding and hook examples for [reqnroll-testing](../SKILL.md)
(Steps 3 and 5).

## Step bindings

```csharp
// Steps/CartSteps.cs
using Reqnroll;
using Xunit;

[Binding]
public class CartSteps
{
    private CheckoutPage _page;
    private Cart _cart;

    [Given("a logged-in user with email confirmed")]
    public async Task GivenLoggedInUser()
    {
        var user = await TestUsers.LoggedInWithEmailConfirmed();
        _page = new CheckoutPage(user);
    }

    [Given(@"the cart contains (\d+) of ""([^""]*)"" at \$(\d+\.\d+)")]
    public void GivenCartContains(int qty, string sku, decimal price)
    {
        _cart = new Cart();
        _cart.AddItem(new Item(sku, qty, price));
        _page.SetCart(_cart);
    }

    [When(@"I enter ""([^""]*)"" in the promo input")]
    public async Task WhenIEnter(string code)
    {
        await _page.EnterPromoAsync(code);
    }

    [When(@"I click ""([^""]*)""")]
    public async Task WhenIClick(string label)
    {
        await _page.ClickAsync(label);
    }

    [Then(@"the subtotal updates to \$(\d+\.\d+)")]
    public void ThenSubtotalUpdates(decimal expected)
    {
        Assert.Equal(expected, _page.GetSubtotal(), 2);
    }
}
```

Per [reqnroll-home][rh]: "Supports flexible step definitions using
regex or cucumber expressions." The example uses regex; cucumber
expressions are an alternative:

```csharp
[Given("the cart contains {int} of {string} at ${double}")]
public void GivenCartContains(int qty, string sku, double price) { ... }
```

Cucumber expressions are more readable; regex is more flexible.

## Hooks

```csharp
using Reqnroll;

[Binding]
public class TestHooks
{
    [BeforeTestRun]
    public static async Task BeforeTestRun()
    {
        // Once per test run
        await TestDatabase.Initialize();
    }

    [BeforeScenario]
    public async Task BeforeScenario()
    {
        // Per-scenario
        await TestDatabase.StartTransaction();
    }

    [AfterScenario]
    public async Task AfterScenario(ScenarioContext context)
    {
        await TestDatabase.Rollback();
        if (context.TestError is not null)
        {
            await ScreenshotCapture.Capture(context.ScenarioInfo.Title);
        }
    }

    [BeforeScenario("@browser")]
    public async Task BeforeBrowserScenario()
    {
        // Tag-scoped hook
        await Browser.LaunchAsync();
    }
}
```

## Source

- [rh][rh] - Reqnroll overview: flexible step definitions (regex or
  cucumber expressions), async hooks.

[rh]: https://reqnroll.net/
