# Picking a BDD runner - decision table and first-run commands

Deep reference for `cucumber-testing`. Runner choice in BDD is almost
entirely determined by your language and build system, because step
definitions are written in that language. Read the repo, match a row, stop
deliberating.

| What you find in the repo | Runner | Package to add |
|---|---|---|
| `pom.xml` or `build.gradle` (Java, Kotlin, Scala, Groovy) | Cucumber-JVM | `io.cucumber:cucumber-java` plus `cucumber-junit-platform-engine` ([cucumber.io/docs/installation/java][install-java], [cucumber-jvm README][cucumber-jvm]) |
| `package.json` (JavaScript or TypeScript on Node) | Cucumber-JS | `@cucumber/cucumber` ([cucumber.io/docs/installation/javascript][install-js]) |
| `Gemfile` or `*.gemspec` (Ruby, Rails) | Cucumber-Ruby | `gem 'cucumber'`, or `cucumber-rails` for Rails ([cucumber.io/docs/installation/ruby][install-ruby]) |
| `requirements.txt` or `pyproject.toml` (Python) | Behave (`behave-testing`) | `behave` ([behave.readthedocs.io/install][behave-install]) |
| `*.csproj` or `*.sln` (.NET, any test framework) | **Reqnroll** (`reqnroll-testing`) | `Reqnroll.NUnit`, `Reqnroll.MsTest`, `Reqnroll.xUnit` or `Reqnroll.TUnit` ([docs.reqnroll.net setup][reqnroll-setup]) |
| A .NET repo that already references `SpecFlow.*` packages | Migrate to Reqnroll | see the SpecFlow note below |
| No stakeholder outside engineering will ever read the feature files | None. Write tests directly in your test framework | see "When BDD is not worth it" below |

## The .NET trap: do not start on SpecFlow

SpecFlow was the standard .NET BDD runner for a decade, so most tutorials
still point at it. It is dead: Tricentis states "SpecFlow has been retired"
([shiftsync.tricentis.com][specflow-retired]), `specflow.org` redirects
there, and it "reached its end-of-life on December 31, 2024" with the
GitHub projects deleted as of 1 January ([reqnroll.net][specflow-eol]). The
packages still install only because nuget.org will not delete existing ones
([reqnroll.net][specflow-eol]) - exactly how newcomers land on an
unsupported dependency. Use **Reqnroll**, the maintained successor: "a
reboot of the SpecFlow project" ([reqnroll.net][reqnroll-home]); migrating
is mostly package and namespace renames, not a rewrite
([reqnroll.net][specflow-eol]). See `reqnroll-testing` (and its
references/specflow-legacy.md for not-yet-migrated projects).

## First runnable path per runner

Run the block that matches your row. Success looks the same everywhere: the
runner reports **undefined** steps and prints copy-pasteable
step-definition snippets. That is the correct first result, not a failure.

```bash
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

# .NET (Reqnroll), per docs.reqnroll.net/latest/installation/setup-project.html
dotnet new install Reqnroll.Templates.DotNet
dotnet new reqnroll-project -t nunit -f net8.0 -o CheckoutSpecs
cd CheckoutSpecs && dotnet test
```

Command sources: `npm install --save-dev @cucumber/cucumber`
([install/javascript][install-js]) with `npx cucumber-js`
([cucumber-js CLI][cucumber-js-cli]); `pip install behave`
([behave install][behave-install]); `./mvnw test` on the starter repo,
which runs features through Cucumber's JUnit Platform Engine
([jvm starter][jvm-starter]); `gem install cucumber` and `cucumber --init`
([install/ruby][install-ruby]); the Reqnroll template install and `-t` /
`-f` flags per [docs.reqnroll.net setup][reqnroll-setup].

## When BDD is not worth it

BDD's payoff is the shared understanding produced by the conversation. The
Cucumber project is explicit that documentation and automated tests "are
produced by a BDD team, you can think of them as nice side-effects. The
real goal is valuable, working software, and the fastest way to get there
is through conversations between the people who are involved in imagining
and delivering that software." ([cucumber.io/docs/bdd][bdd-what])

Read that as a cost test (practitioner judgment, not a documented rule):
**if no non-technical stakeholder ever reads, reviews or writes a feature
file, the translation layer is pure overhead.** Write the tests directly in
JUnit, pytest, NUnit or Mocha instead. Usually skip BDD for: internal
libraries, SDKs, CLIs and infrastructure with no business-facing behaviour;
teams where only engineers have ever opened a feature file; retrofitting
Gherkin onto an existing UI automation suite; and spike work whose
specification is not stable enough to formulate.

The honest signal that BDD is working: someone who does not write code has
edited a `.feature` file in the last month.

[bdd-what]: https://cucumber.io/docs/bdd/
[install-java]: https://cucumber.io/docs/installation/java/
[install-js]: https://cucumber.io/docs/installation/javascript/
[install-ruby]: https://cucumber.io/docs/installation/ruby/
[cucumber-jvm]: https://github.com/cucumber/cucumber-jvm
[cucumber-js-cli]: https://github.com/cucumber/cucumber-js/blob/main/docs/cli.md
[jvm-starter]: https://github.com/cucumber/cucumber-jvm-starter-maven-java
[behave-install]: https://behave.readthedocs.io/en/latest/install/
[reqnroll-home]: https://reqnroll.net/
[reqnroll-setup]: https://docs.reqnroll.net/latest/installation/setup-project.html
[specflow-eol]: https://reqnroll.net/news/2025/01/specflow-end-of-life-has-been-announced/
[specflow-retired]: https://shiftsync.tricentis.com/p/shift-to-shiftsync
