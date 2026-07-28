# flaui-tests - locator forms and CI reference

Alternate locator forms and the CI workflow, kept out of the SKILL spine. See
[SKILL.md](../SKILL.md) for the core launch, find, interact, and wait flow.

Sources: FlaUI [Searching wiki][flauisearch],
[Microsoft Learn - UI Automation Overview][msuia2].

[flauisearch]: https://github.com/FlaUI/FlaUI/wiki/Searching
[msuia2]: https://learn.microsoft.com/dotnet/framework/ui-automation/ui-automation-overview

## Alternate locator forms

The lambda form (in SKILL.md) is the shortest and the upstream convention. Two
equivalent forms resolve to the same UIA query:

```csharp
// ConditionFactory form
var b = window.FindFirstDescendant(ConditionFactory.ByAutomationId("LoginButton"));

// Property + tree-scope form
var b3 = window.FindFirst(
    TreeScope.Descendants,
    new PropertyCondition(
        Automation.PropertyLibrary.Element.AutomationIdProperty, "LoginButton"));
```

## Find method families ([flauisearch][flauisearch])

- `FindFirstChild` / `FindAllChildren` - immediate children only.
- `FindFirstDescendant` / `FindAllDescendants` - full subtree.
- `FindFirstNested` / `FindAllNested` - multi-level condition arrays.

Condition constructors: `ByAutomationId`, `ByName`, `ByText`, `ByClassName`,
`ByControlType`, plus boolean combinators `AndCondition` / `OrCondition` /
`NotCondition`.

## Locator-selection order (most stable first)

1. `ByAutomationId` - developer-set stable identifier per [msuia2][msuia2];
   locale-independent and theme-independent.
2. `ByControlType` + a nested condition - when no AutomationId is available,
   pair the control type (Button / Edit / ListItem) with another property.
3. `ByName` - last resort; localised apps change `Name` per language.

## CI integration

Windows runner required - UIA is Windows-only per [msuia2][msuia2].
`windows-latest` provides an interactive desktop session by default, required
because UIA cannot drive Session-0 / non-interactive desktops. Self-hosted
Windows-container runners need interactive logon + Auto-Login + an unlocked
desktop.

```yaml
# .github/workflows/flaui.yml
jobs:
  ui-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - name: Build app under test
        run: dotnet build src/MyApp -c Release
      - name: Run FlaUI tests
        run: dotnet test tests/MyApp.UiTests --logger "trx;LogFileName=ui.trx"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: trx-results
          path: '**/ui.trx'
```
