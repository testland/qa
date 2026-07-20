---
name: bdd-overview
description: "Teaches behaviour-driven development end to end for a newcomer: what BDD is and how discovery, formulation and automation fit together; a decision table that picks the runner from the project's language and build files (Cucumber-JVM, Cucumber-JS, Cucumber-Ruby, Behave for Python, Reqnroll for .NET, and why SpecFlow is end-of-life); install and first-run commands for each; the declarative-versus-imperative Gherkin discipline with a worked bad-versus-good pair; Background, Scenario Outline and domain-organised step libraries; the traps that make BDD collapse into an expensive UI-automation wrapper; and an honest account of when BDD is not worth adopting. Use when a team is adopting BDD, choosing a Gherkin runner, or a *.feature file needs writing and nobody has settled the conventions."
---

# bdd-overview

## What BDD is and where it sits

Behaviour Driven Development is "a way for software teams to work that closes
the gap between business people and technical people"
([cucumber.io/docs/bdd][bdd-what]). It runs as three repeating practices:
**Discovery** ("talk about concrete examples of the new functionality to
explore, discover and agree on the details of what's expected to be done"),
**Formulation** ("document those examples in a way that can be automated, and
check for agreement"), and **Automation** ("implement the behaviour described by
each documented example, starting with an automated test to guide the
development of the code") ([cucumber.io/docs/bdd][bdd-what]).

The formulation language is **Gherkin**: "a set of special keywords to give
structure and meaning to executable specifications"
([cucumber.io/docs/gherkin/reference][gherkin-ref]). A `.feature` file is plain
text. A **step definition** binds each Gherkin line to code in your language. A
**runner** parses the feature files, matches steps to definitions, and reports
results through your existing test framework (JUnit, pytest, NUnit, Mocha).

BDD is not a test level. It is a specification format that can drive a unit
test, a service test or a full browser test; the step definitions decide which.
The same scenario runs in milliseconds against a domain service and in seconds
through a browser, so bind to the lowest layer that still exercises the
behaviour the business named.

Discovery is a conversation between the **Three Amigos**
([cucumber.io/docs/bdd/who-does-what][three-amigos]): a Product Owner or BA who
defines scope and user intent, a Tester who generates scenarios and edge cases,
and a Developer who adds step detail and implementation constraints. "These
conversations can produce great tests, because each amigo sees the product from
a different perspective." ([cucumber.io/docs/bdd/who-does-what][three-amigos])

## Pick your runner

Runner choice in BDD is almost entirely determined by your language and build
system, because step definitions are written in that language. Read the repo,
match a row, stop deliberating.

| What you find in the repo | Runner | Package to add |
|---|---|---|
| `pom.xml` or `build.gradle` (Java, Kotlin, Scala, Groovy) | Cucumber-JVM | `io.cucumber:cucumber-java` plus `cucumber-junit-platform-engine` ([cucumber.io/docs/installation/java][install-java], [cucumber-jvm README][cucumber-jvm]) |
| `package.json` (JavaScript or TypeScript on Node) | Cucumber-JS | `@cucumber/cucumber` ([cucumber.io/docs/installation/javascript][install-js]) |
| `Gemfile` or `*.gemspec` (Ruby, Rails) | Cucumber-Ruby | `gem 'cucumber'`, or `cucumber-rails` for Rails ([cucumber.io/docs/installation/ruby][install-ruby]) |
| `requirements.txt` or `pyproject.toml` (Python) | Behave | `behave` ([behave.readthedocs.io/install][behave-install]) |
| `*.csproj` or `*.sln` (.NET, any test framework) | **Reqnroll** | `Reqnroll.NUnit`, `Reqnroll.MsTest`, `Reqnroll.xUnit` or `Reqnroll.TUnit` ([docs.reqnroll.net setup][reqnroll-setup]) |
| A .NET repo that already references `SpecFlow.*` packages | Migrate to Reqnroll | see the SpecFlow note below |
| No stakeholder outside engineering will ever read the feature files | None. Write tests directly in your test framework | see "When BDD is not worth it" |

### The .NET trap: do not start on SpecFlow

SpecFlow was the standard .NET BDD runner for a decade, so most tutorials still
point at it. It is dead: Tricentis, which owned it, states "SpecFlow has been
retired" ([shiftsync.tricentis.com][specflow-retired]), and `specflow.org` now
redirects there. The dates: "SpecFlow reached its end-of-life on December 31,
2024", and "as of 1st January, the SpecFlow GitHub projects are deleted"
([reqnroll.net, SpecFlow end-of-life][specflow-eol]). The packages still install
because "nuget.org ... does not allow to delete the existing SpecFlow packages,
so you can keep using SpecFlow for now" ([reqnroll.net][specflow-eol]), which is
exactly how newcomers end up on an unsupported dependency.

Reqnroll is the maintained successor: "an open-source Cucumber-style BDD test
automation framework for .NET. It has been created as a reboot of the SpecFlow
project" ([reqnroll.net][reqnroll-home]). It was forked from the SpecFlow
codebase and renamed because "SpecFlow" is a Tricentis trademark, so migrating
is mostly package and namespace renames, not a rewrite
([reqnroll.net][specflow-eol]).

## First runnable path

Run your row's block. Success looks the same everywhere: the runner reports
**undefined** steps and prints copy-pasteable step-definition snippets. That is
the correct first result, not a failure.

```bash
# .NET (Reqnroll), per docs.reqnroll.net/latest/installation/setup-project.html
dotnet new install Reqnroll.Templates.DotNet
dotnet new reqnroll-project -t nunit -f net8.0 -o CheckoutSpecs
cd CheckoutSpecs && dotnet test

# Node (Cucumber-JS), per cucumber.io/docs/installation/javascript
npm install --save-dev @cucumber/cucumber
mkdir -p features/step_definitions && npx cucumber-js

# Python (Behave), per behave.readthedocs.io/en/latest/install
pip install behave
mkdir -p features/steps && behave

# Java (Cucumber-JVM), the maintained Maven starter project
git clone https://github.com/cucumber/cucumber-jvm-starter-maven-java
cd cucumber-jvm-starter-maven-java && ./mvnw test

# Ruby (Cucumber-Ruby), per cucumber.io/docs/installation/ruby
gem install cucumber
cucumber --init && cucumber
```

Command sources: the template install and `-t` / `-f` flags
([docs.reqnroll.net setup][reqnroll-setup]); `npm install --save-dev
@cucumber/cucumber` ([install/javascript][install-js]) with `npx cucumber-js`
([cucumber-js CLI][cucumber-js-cli]); `pip install behave`
([behave install][behave-install]); `./mvnw test` on the starter repo, which runs
features through Cucumber's JUnit Platform Engine ([jvm starter][jvm-starter]);
`gem install cucumber` and `cucumber --init` ([install/ruby][install-ruby]). To
add Reqnroll to an existing .NET test project instead of scaffolding, run
`dotnet add package Reqnroll.NUnit` ([docs.reqnroll.net setup][reqnroll-setup]).

## The Gherkin discipline that decides whether this works

This is the part newcomers get wrong, and getting it wrong is what turns BDD
into an expensive way to write browser automation.

"Your scenarios should describe the intended behaviour of the system, not the
implementation. In other words, it should describe *what*, not *how*."
([cucumber.io/docs/bdd/better-gherkin][better-gherkin]) The test to apply to
every line: "Will this wording need to change if the implementation does?"
([cucumber.io/docs/bdd/better-gherkin][better-gherkin]) If yes, the line is
wrong.

**Bad: imperative, UI-mechanical.**

```gherkin
Scenario: Promo code
  Given I open "https://shop.example.com/login"
  And I type "ada@example.com" into "#email"
  And I type "hunter2" into "#password"
  And I click "#login-btn"
  And I click ".product[data-sku='BOOK-001'] .add-to-cart"
  And I click "#cart-icon"
  And I type "WELCOME10" into "#promo-input"
  And I click "#apply-promo"
  Then the element "#subtotal" has text "$22.49"
```

Nine steps, nine step definitions, four CSS selectors baked into the
specification. Nobody in the business can read it, and a login redesign breaks
it even though promo-code behaviour did not change.

**Good: declarative, intent-level.**

```gherkin
Scenario: Valid promo code reduces the subtotal
  Given a logged-in customer with "BOOK-001" at $24.99 in their cart
  When they apply promo code "WELCOME10"
  Then the subtotal is $22.49
```

Three steps. The selectors and the login mechanics move into the step
definition code, where changing them is a one-line edit that no feature file
sees. Declarative style "describes the behaviour of the application, rather than
the implementation details" ([cucumber.io/docs/bdd/better-gherkin][better-gherkin]).

### Background for shared setup, Scenario Outline for parameters

A `Background` "allows you to add some context to the scenarios that follow it.
It can contain one or more `Given` steps, which are run before *each* scenario",
and there is "only one set of `Background` steps per `Feature` or `Rule`"
([cucumber.io/docs/gherkin/reference][gherkin-ref]). A `Scenario Outline` "is run
*once for each row* in the Examples section beneath it (not counting the first
header row)", with `<angle-bracket>` placeholders substituted from the table
before steps are matched ([cucumber.io/docs/gherkin/reference][gherkin-ref]).

```gherkin
Feature: Checkout promotions

  Background:
    Given a logged-in customer with "BOOK-001" at $24.99 in their cart

  Scenario: Valid promo code reduces the subtotal
    When they apply promo code "WELCOME10"
    Then the subtotal is $22.49

  Scenario Outline: Promo code outcomes
    When they apply promo code "<code>"
    Then the subtotal is <subtotal>
    And the message is "<message>"

    Examples:
      | code      | subtotal | message               |
      | WELCOME10 | 22.49    | 10% off applied       |
      | EXPIRED   | 24.99    | This code has expired |
      | GIBBERISH | 24.99    | Unknown promo code    |
```

Three near-identical copy-pasted scenarios collapse into one outline plus a
table a BA can extend without touching code.

### One step definition per domain concept, not per sentence

The failure mode has a name. **Feature-coupled step definitions** are "step
definitions that **can't be reused** across features or scenarios", and they
lead to "an explosion of step definitions, code duplication, and high
maintenance costs" ([cucumber.io/docs/guides/anti-patterns][anti-patterns]).
The fix: "organise your steps by domain concept" and use "domain-related names
(rather than feature- or scenario-related names)"
([cucumber.io/docs/guides/anti-patterns][anti-patterns]).

Concretely, one parameterised `a logged-in customer with "{sku}" at ${price} in
their cart` serves every checkout feature. Ten scenario-specific variants of it
do not. Before writing a new step, grep the existing step definitions for the
domain noun; reuse beats authoring.

Also avoid **conjunction steps** that fold two actions into one line ("I have
shades and a brand new Mustang"); split them across Gherkin's own conjunction
keywords, because "you want to strive to keep your steps atomic as much as
possible" ([cucumber.io/docs/guides/anti-patterns][anti-patterns]).

## Traps newcomers hit first

- **Writing the Gherkin after the code is done.** That skips Discovery, which
  is where the value is; formulation alone just adds a parsing layer over tests
  you already wrote ([cucumber.io/docs/bdd][bdd-what]).
- **On .NET, installing SpecFlow because the tutorial said so.** End-of-life
  since 31 December 2024 ([reqnroll.net][specflow-eol]). Use Reqnroll.
- **`Then` steps with no observable outcome.** "Then the user is happy" cannot
  assert. `Then` describes "an *expected* outcome, or result" and its definition
  should "use an *assertion* to compare the *actual* outcome to the *expected*
  outcome" ([cucumber.io/docs/gherkin/reference][gherkin-ref]).
- **Ten-step `And` chains.** Usually a symptom of imperative style; rewrite at
  intent level before adding step definitions.
- **Overloading `Background`.** It runs before *every* scenario in the feature
  ([cucumber.io/docs/gherkin/reference][gherkin-ref]), so setup only two of eight
  scenarios need belongs in those scenarios instead.
- **Driving everything through the browser.** Gherkin does not require a UI.
  Bind steps to the service or domain layer wherever the named behaviour lives,
  and keep browser-bound scenarios to the few that genuinely test the UI.
- **Treating the runner as the point.** "There's much more to BDD than just
  using Cucumber" ([cucumber.io/docs/bdd][bdd-what]).

## When BDD is not worth it

BDD's payoff is the shared understanding produced by the conversation. The
Cucumber project is explicit that documentation and automated tests "are
produced by a BDD team, you can think of them as nice side-effects. The real
goal is valuable, working software, and the fastest way to get there is through
conversations between the people who are involved in imagining and delivering
that software." ([cucumber.io/docs/bdd][bdd-what])

Read that as a cost test, which is practitioner judgment rather than a
documented rule: **if no non-technical stakeholder ever reads, reviews or writes
a feature file, the translation layer is pure overhead.** Gherkin parsing, step
matching, the glue code and the extra indirection while debugging are real
costs, paid to buy readability for an audience that is not reading. Write the
tests directly in JUnit, pytest, NUnit or Mocha instead. Usually skip BDD for:
internal libraries, SDKs, CLIs and infrastructure with no business-facing
behaviour; teams where only engineers have ever opened a feature file;
retrofitting Gherkin onto an existing UI automation suite (which reliably
produces the imperative anti-pattern above with no discovery benefit); and spike
work whose specification is not stable enough to formulate.

The honest signal that BDD is working: someone who does not write code has
edited a `.feature` file in the last month.

## Related skills

These go deeper on individual pieces, where also installed:
[`cucumber-testing`](../cucumber-testing/SKILL.md),
[`behave-testing`](../behave-testing/SKILL.md),
[`reqnroll-testing`](../reqnroll-testing/SKILL.md),
[`gherkin-from-stories`](../gherkin-from-stories/SKILL.md),
[`manual-step-to-gherkin`](../manual-step-to-gherkin/SKILL.md),
[`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md).

[bdd-what]: https://cucumber.io/docs/bdd/
[gherkin-ref]: https://cucumber.io/docs/gherkin/reference/
[three-amigos]: https://cucumber.io/docs/bdd/who-does-what/
[better-gherkin]: https://cucumber.io/docs/bdd/better-gherkin/
[anti-patterns]: https://cucumber.io/docs/guides/anti-patterns/
[install-java]: https://cucumber.io/docs/installation/java/
[install-js]: https://cucumber.io/docs/installation/javascript/
[install-ruby]: https://cucumber.io/docs/installation/ruby/
[cucumber-js-cli]: https://github.com/cucumber/cucumber-js/blob/main/docs/cli.md
[cucumber-jvm]: https://github.com/cucumber/cucumber-jvm
[jvm-starter]: https://github.com/cucumber/cucumber-jvm-starter-maven-java
[behave-install]: https://behave.readthedocs.io/en/latest/install/
[reqnroll-home]: https://reqnroll.net/
[reqnroll-setup]: https://docs.reqnroll.net/latest/installation/setup-project.html
[specflow-eol]: https://reqnroll.net/news/2025/01/specflow-end-of-life-has-been-announced/
[specflow-retired]: https://shiftsync.tricentis.com/p/shift-to-shiftsync
