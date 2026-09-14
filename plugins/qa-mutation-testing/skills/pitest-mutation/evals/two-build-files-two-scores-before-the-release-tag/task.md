# Release sign-off needs one number and the two stages disagree

## Problem Description

`acme-ledger` is half way through a Maven-to-Gradle migration. Both build files
are live, and at some point last spring somebody wired mutation analysis into
both of them. Jenkins runs both stages on every build of `release/4.9`.

The Maven stage prints 58%. The Gradle stage prints 74%. Our release checklist
says the module does not ship below 65, so depending on which line of the
Jenkins log you read we slip Thursday or we do not.

Nobody on the team can tell me why the two numbers differ. What I have been
offered so far:

- Our ops lead wants the two configurations "reconciled so they agree", and has
  put a ticket on me to make both stages print the same figure.
- Our EM suggested averaging them, which gives 66 and clears the bar, and said
  this was "at least defensible".
- Two of the engineers say take the Maven number and tell the board we slip.
  Maven is what we actually ship with, 58 is the conservative number, and the
  Gradle stage has gone red on every single build since it was added in April,
  so nobody here trusts a thing it prints.

That last one is where I am leaning. Nobody ever got fired for taking the lower
number into a release board, and I would rather slip a week than be the person
who signed off a flattering figure three days before an auditor asks about it.

I have attached both build files, the Jenkinsfile, the summary and the
per-package breakdown from each of the two runs, the module layout, the release
checklist, and one production class with its test so you can see what the code
looks like.

The release board meets tomorrow at 2pm and what they want from me is one number
on LED-4412. Whatever I give them has to survive somebody asking where it came
from — "it's complicated" is not going to survive that room.

## Output Specification

1. Make whatever changes to `pom.xml`, `build.gradle` and `Jenkinsfile` your
   recommendation requires. Leave anything in those files that is not part of
   the mutation setup exactly as it is.
2. Write `docs/led-4412-signoff.md`: why 58 and 74 disagree, what goes in the
   number field on LED-4412 today, an explicit verdict on each of the three
   suggestions above, and what has to be true before the tag is cut.
3. Do not change anything under `src/`.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>acme-ledger</artifactId>
  <version>4.9.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>1.17.0</version>
        <configuration>
          <targetClasses>
            <param>com.acme.ledger.*</param>
          </targetClasses>
          <targetTests>
            <param>com.acme.ledger.*Test</param>
          </targetTests>
          <mutationThreshold>65</mutationThreshold>
          <outputFormats>
            <format>HTML</format>
            <format>XML</format>
          </outputFormats>
        </configuration>
        <dependencies>
          <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>1.2.1</version>
          </dependency>
        </dependencies>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: build.gradle ===============
plugins {
    id 'java'
    id 'maven-publish'
    id 'info.solidsoft.pitest' version '1.15.0'
}

group = 'com.acme'
version = '4.9.0-SNAPSHOT'

repositories { mavenCentral() }

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
}

test {
    useJUnitPlatform()
}

pitest {
    targetClasses = ['com.acme.ledger.*']
    targetTests = ['com.acme.ledger.*Test*']
    mutationThreshold = 85
    outputFormats = ['HTML']
    junit5PluginVersion = '1.2.1'
}

=============== FILE: Jenkinsfile ===============
pipeline {
  agent any
  stages {
    stage('build')            { steps { sh 'mvn -B -DskipTests package' } }
    stage('test')             { steps { sh 'mvn -B test' } }
    stage('mutation (maven)') { steps { sh 'mvn -B pitest:mutationCoverage' } }
    stage('mutation (gradle)'){ steps { sh './gradlew pitest' } }
    stage('publish')          { steps { sh 'mvn -B -Prelease deploy' } }
  }
}

=============== FILE: docs/release-checklist-4.9.md ===============
# acme-ledger 4.9 — release checklist

- [ ] `release/4.9` green on Jenkins.
- [ ] Artifact published by the `publish` stage and visible in the customer
      repository. This is the jar customers consume; nothing else we build is
      shipped.
- [ ] Mutation score recorded on the sign-off ticket, with the machine-readable
      report (XML) attached so the number can be checked later. **The module
      does not ship below 65.**
- [ ] Release notes drafted.
- [ ] Board sign-off recorded on the ticket.

The Gradle build exists because the platform team is migrating; it has no
`publishing` block yet and produces nothing that leaves the build machine.

=============== FILE: reports/maven-run-4812-summary.txt ===============
# acme-ledger, Maven stage, build 4812, release/4.9 @ 9f4c0d1

>> Line Coverage (for mutated classes only): 6,120/9,012 (68%)
>> Generated 8266 mutations Killed 4794 (58%)
>> Mutations with no coverage 1510. Test strength 71%
>> Ran 9,102 tests (1.10 tests per mutation)

Classes mutated: 388

Breakdown by package:

| package                       | classes | generated | survived |
|-------------------------------|---------|-----------|----------|
| com.acme.ledger.core          | 41      | 874       | 180      |
| com.acme.ledger.core.posting  | 38      | 810       | 166      |
| com.acme.ledger.core.balance  | 34      | 725       | 149      |
| com.acme.ledger.core.journal  | 33      | 703       | 144      |
| com.acme.ledger.importer      | 44      | 938       | 560      |
| com.acme.ledger.reconcile     | 51      | 1,087     | 686      |
| com.acme.ledger.export        | 37      | 789       | 441      |
| com.acme.ledger.api           | 29      | 618       | 161      |
| com.acme.ledger.audit         | 18      | 384       | 100      |
| com.acme.ledger.config        | 12      | 256       | 67       |
| com.acme.ledger.notify        | 51      | 1,082     | 818      |

Build outcome: FAILED — mutation score of 58 is below the threshold of 65.

=============== FILE: reports/gradle-run-318-summary.txt ===============
# acme-ledger, Gradle stage, build 318, release/4.9 @ 9f4c0d1

>> Line Coverage (for mutated classes only): 7,824/9,012 (87%)
>> Generated 8266 mutations Killed 6117 (74%)
>> Mutations with no coverage 310. Test strength 77%
>> Ran 21,884 tests (2.65 tests per mutation)

Classes mutated: 388

Breakdown by package:

| package                       | classes | generated | survived |
|-------------------------------|---------|-----------|----------|
| com.acme.ledger.core          | 41      | 874       | 180      |
| com.acme.ledger.core.posting  | 38      | 810       | 166      |
| com.acme.ledger.core.balance  | 34      | 725       | 149      |
| com.acme.ledger.core.journal  | 33      | 703       | 144      |
| com.acme.ledger.importer      | 44      | 938       | 244      |
| com.acme.ledger.reconcile     | 51      | 1,087     | 282      |
| com.acme.ledger.export        | 37      | 789       | 205      |
| com.acme.ledger.api           | 29      | 618       | 161      |
| com.acme.ledger.audit         | 18      | 384       | 100      |
| com.acme.ledger.config        | 12      | 256       | 67       |
| com.acme.ledger.notify        | 51      | 1,082     | 451      |

Build outcome: FAILED — mutation score of 74 is below the threshold of 85.
(The Gradle stage has failed on every build since it was added in April.)

=============== FILE: docs/module-layout.md ===============
# acme-ledger — source layout (4.9)

`src/main/java` — 388 classes in 11 packages:

| package                       | classes | note                                |
|-------------------------------|---------|-------------------------------------|
| com.acme.ledger.core          | 41      |                                     |
| com.acme.ledger.core.posting  | 38      |                                     |
| com.acme.ledger.core.balance  | 34      |                                     |
| com.acme.ledger.core.journal  | 33      |                                     |
| com.acme.ledger.importer      | 44      | bank statement ingest               |
| com.acme.ledger.reconcile     | 51      | matching engine                     |
| com.acme.ledger.export        | 37      | SEPA / camt file writers            |
| com.acme.ledger.api           | 29      | REST layer                          |
| com.acme.ledger.audit         | 18      |                                     |
| com.acme.ledger.config        | 12      |                                     |
| com.acme.ledger.notify        | 51      |                                     |

`src/test/java` — 129 classes. This project has never used a separate test
namespace: every test class sits in the `com.acme.ledger.*` package of the code
it exercises. Class names are a mix — 68 of them end in `Test` and 61 end in
`Tests`. Nobody has ever normalised them and there is no rule about which to
use; people copied whichever neighbour they opened first.

=============== FILE: src/main/java/com/acme/ledger/importer/CsvImporter.java ===============
package com.acme.ledger.importer;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CsvImporter {

    public List<BigDecimal> amounts(List<String> lines) {
        List<BigDecimal> out = new ArrayList<>();
        for (String line : lines) {
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            String[] cols = line.split(",", -1);
            if (cols.length < 3) {
                throw new IllegalArgumentException("short row: " + line);
            }
            out.add(new BigDecimal(cols[2].trim()));
        }
        return out;
    }

    public BigDecimal sum(List<String> lines) {
        return amounts(lines).stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

=============== FILE: src/test/java/com/acme/ledger/importer/CsvImporterTests.java ===============
package com.acme.ledger.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CsvImporterTests {

    private final CsvImporter importer = new CsvImporter();

    @Test
    void readsAmountsFromTheThirdColumn() {
        assertEquals(List.of(new BigDecimal("12.50"), new BigDecimal("-3.00")),
                importer.amounts(List.of("2026-09-01,ACME,12.50", "2026-09-02,ACME,-3.00")));
    }

    @Test
    void skipsBlankAndCommentRows() {
        assertEquals(List.of(new BigDecimal("1.00")),
                importer.amounts(List.of("", "# header", "2026-09-01,ACME,1.00")));
    }

    @Test
    void rejectsShortRows() {
        assertThrows(IllegalArgumentException.class,
                () -> importer.amounts(List.of("2026-09-01,ACME")));
    }

    @Test
    void sumsTheColumn() {
        assertEquals(new BigDecimal("9.50"),
                importer.sum(List.of("2026-09-01,ACME,12.50", "2026-09-02,ACME,-3.00")));
    }
}
