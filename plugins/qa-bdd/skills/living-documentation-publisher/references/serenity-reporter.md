# Serenity BDD aggregate report (JVM)

Renders living documentation for Maven/Gradle projects that run
`CucumberWithSerenity`. Referenced from
[living-documentation-publisher](../SKILL.md) Step 3.

## Bind the Serenity Maven plugin

Add the Serenity Maven plugin and bind it to `post-integration-test`
([serenity-bdd/the-serenity-book, maven.adoc][mv]):

```xml
<plugin>
  <groupId>net.serenity-bdd.maven.plugins</groupId>
  <artifactId>serenity-maven-plugin</artifactId>
  <version>${serenity.maven.version}</version>
  <executions>
    <execution>
      <id>serenity-reports</id>
      <phase>post-integration-test</phase>
      <goals><goal>aggregate</goal></goals>
    </execution>
  </executions>
</plugin>
```

## Run

Run the full pipeline:

```bash
mvn verify
```

Or regenerate the report from existing test data without re-running tests:

```bash
mvn serenity:aggregate
```

## Requirements hierarchy

The Requirements tab of the generated report renders living documentation:
Serenity reads the directory hierarchy under
`src/test/resources/features/[theme]/[capability]/` and maps it to the
requirements hierarchy ([serenity-bdd/the-serenity-book, living-documentation.adoc][ld]).

Set hierarchy labels in `serenity.properties`:

```properties
serenity.requirements.types=theme,capability,story
```

Add a `readme.md` at each directory level; Serenity renders it as contextual
prose above the scenario list, turning the Requirements tab into a readable
illustrated user manual ([serenity-bdd/the-serenity-book, living-documentation.adoc][ld]).

## Sources

- [ld][ld] - Serenity BDD book, living-documentation.adoc: definition, Requirements tab, hierarchy, `serenity.properties` keys (`serenity.requirements.types`, `report.assets.directory`), readme.md enrichment, evidence API.
- [mv][mv] - Serenity BDD book, maven.adoc: `serenity-maven-plugin` coordinates (`net.serenity-bdd.maven.plugins:serenity-maven-plugin`), `aggregate` goal, `post-integration-test` phase binding, `mvn verify`, `serenity:check`.

[ld]: https://raw.githubusercontent.com/serenity-bdd/the-serenity-book/master/modules/ROOT/pages/living-documentation.adoc
[mv]: https://raw.githubusercontent.com/serenity-bdd/the-serenity-book/master/modules/ROOT/pages/maven.adoc
