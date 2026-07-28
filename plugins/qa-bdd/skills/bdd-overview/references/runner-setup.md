# Per-runner install and first run

Install and first-run commands for four of the five runners in
[bdd-overview](../SKILL.md) (the .NET / Reqnroll path stays in the SKILL.md
spine). Run the block that matches your repo. Success everywhere is the same:
the runner reports **undefined** steps and prints copy-pasteable step-definition
snippets - the correct first result, not a failure.

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
```

Command sources: `npm install --save-dev @cucumber/cucumber`
([install/javascript][install-js]) with `npx cucumber-js`
([cucumber-js CLI][cucumber-js-cli]); `pip install behave`
([behave install][behave-install]); `./mvnw test` on the starter repo, which
runs features through Cucumber's JUnit Platform Engine ([jvm starter][jvm-starter]);
`gem install cucumber` and `cucumber --init` ([install/ruby][install-ruby]).

[install-js]: https://cucumber.io/docs/installation/javascript/
[install-ruby]: https://cucumber.io/docs/installation/ruby/
[cucumber-js-cli]: https://github.com/cucumber/cucumber-js/blob/main/docs/cli.md
[jvm-starter]: https://github.com/cucumber/cucumber-jvm-starter-maven-java
[behave-install]: https://behave.readthedocs.io/en/latest/install/
