# Compliance wants every gate at 100 and one number for the audit pack

## Problem Description

We had an incident in July — a pricing rounding bug reached production behind a
green build — and the attached email is what came out of the post-incident
review. Our compliance lead has four things he wants settled before the ISO
surveillance audit on 2026-10-05.

Three of them are about gates: every module's threshold set to 100, the operator
configuration switched to the complete catalogue, and the `pricing` module's
threshold raised from the 60 someone set in 2024. He is not a difficult person
and he is not wrong about the incident. Two of the three look cheap to me and
the third looks overdue, so my instinct is to give him all of it and spend the
rest of the month on something else.

The fourth is the one the board will actually read. He has drafted a sentence
for section 4.2 of the pack giving a single product-wide figure — 66% — and he
wants my sign-off on the wording. That bit I am not worried about; he took the
four module figures off the scores page and it is four numbers and a division.
What I need from you is the gate decisions, written so he can paste them
straight in.

I have attached his email with the draft wording, the parent pom and the two
module poms that matter, the Q3 run summary for all four modules, the
per-operator breakdown from the last `legacy-import` run, sixteen survivors the
team pulled out of that module in August, and the source of the two classes most
of those survivors sit in.

He wants my confirmation by Wednesday and he will take whatever I write straight
into the audit pack, so it needs to be something an auditor can read.

## Output Specification

1. Edit `pom.xml`, `modules/pricing/pom.xml` and `modules/legacy-import/pom.xml`
   to the gate configuration you are recommending.
2. Write `docs/mutation-gate-policy.md` — the reply, addressing all four asks
   explicitly, and setting out the policy the compliance lead can put in the
   audit pack. Include the exact wording you are prepared to have appear in
   section 4.2.
3. Do not write or modify any test in this task; the poms and the reply are the
   deliverable.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/compliance-request.md ===============
From: Ola Brandt (Compliance)
To: Platform engineering
Date: 2026-09-11
Subject: Quality gates — actions from the July incident (INC-2291)

Actions agreed at the post-incident review, to be in place before the ISO
surveillance audit on 2026-10-05:

1. Mutation threshold set to 100 on every module. A gate below 100 is a gate
   that permits untested code to merge, which is precisely what happened in
   INC-2291.

2. Mutation operators set to the complete catalogue. The default set is by
   definition a subset, and the auditor's finding last cycle was that we
   self-selected our own coverage criteria.

3. The pricing module's gate raised from its current value, which predates the
   incident and is visibly below what the module already achieves.

4. Section 4.2 of the pack needs one product-level figure, not four. The auditor
   will not read a table. Draft wording below — please confirm and I will lock
   the section:

   "Across its four production modules, acme-core achieved a mutation coverage
   of 66% for the quarter ending September 2026 (pricing 81%, checkout 78%,
   legacy-import 37%, notify-api 68%)."

Please confirm all four by Wednesday 2026-09-16 so I can close the actions.

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>acme-core</artifactId>
  <version>7.3.0-SNAPSHOT</version>
  <packaging>pom</packaging>

  <modules>
    <module>modules/pricing</module>
    <module>modules/checkout</module>
    <module>modules/legacy-import</module>
    <module>modules/notify-api</module>
  </modules>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <pit.threshold>0</pit.threshold>
    <pit.coverage.threshold>0</pit.coverage.threshold>
  </properties>

  <build>
    <pluginManagement>
      <plugins>
        <plugin>
          <groupId>org.pitest</groupId>
          <artifactId>pitest-maven</artifactId>
          <version>1.17.0</version>
          <configuration>
            <mutators>
              <mutator>ALL</mutator>
            </mutators>
            <mutationThreshold>${pit.threshold}</mutationThreshold>
            <coverageThreshold>${pit.coverage.threshold}</coverageThreshold>
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
    </pluginManagement>
  </build>
</project>

=============== FILE: modules/pricing/pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>com.acme</groupId>
    <artifactId>acme-core</artifactId>
    <version>7.3.0-SNAPSHOT</version>
    <relativePath>../../pom.xml</relativePath>
  </parent>
  <artifactId>pricing</artifactId>

  <properties>
    <pit.threshold>60</pit.threshold>
    <pit.coverage.threshold>70</pit.coverage.threshold>
  </properties>

  <build>
    <plugins>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <configuration>
          <targetClasses>
            <param>com.acme.pricing.*</param>
          </targetClasses>
          <targetTests>
            <param>com.acme.pricing.*Test</param>
          </targetTests>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: modules/legacy-import/pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>com.acme</groupId>
    <artifactId>acme-core</artifactId>
    <version>7.3.0-SNAPSHOT</version>
    <relativePath>../../pom.xml</relativePath>
  </parent>
  <artifactId>legacy-import</artifactId>

  <build>
    <plugins>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <configuration>
          <targetClasses>
            <param>com.acme.legacyimport.*</param>
          </targetClasses>
          <targetTests>
            <param>com.acme.legacyimport.*Test</param>
          </targetTests>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: reports/module-scores-2026-q3.md ===============
# acme-core — scheduled mutation runs, last three per module

| module        | gate today | 2026-07-05 | 2026-08-02 | 2026-09-06 | mutations (09-06) | killed (09-06) |
|---------------|------------|------------|------------|------------|-------------------|----------------|
| pricing       | 60         | 81         | 82         | 81         | 2,940             | 2,381          |
| checkout      | 75         | 77         | 76         | 78         | 5,118             | 3,992          |
| legacy-import | none (0)   | 36         | 36         | 37         | 12,480            | 4,618          |
| notify-api    | 65         | 68         | 69         | 68         | 3,377             | 2,296          |

`legacy-import` inherits the parent default, so it is effectively ungated: the
build has never failed on it. It is 62k lines of statement-import code written
between 2011 and 2016, in maintenance only, roughly 40 lines changed per
quarter. It is also by some distance the largest thing we mutate.

Scheduled full runs take: pricing 41m, checkout 1h18m, legacy-import 3h06m,
notify-api 52m. All four modules inherit the parent's operator configuration.

From the platform changelog:

| date    | ticket    | change                                                     |
|---------|-----------|------------------------------------------------------------|
| 2024-03 | PLAT-1904 | Gates introduced. pricing 60, checkout 75, notify-api 65.   |
| 2024-11 | PLAT-2210 | Operator set widened to the complete catalogue, all modules.|
| 2025-06 | PLAT-2788 | checkout gate 70 -> 75 after two quarters above it.         |
| 2026-02 | PLAT-3301 | legacy-import added to the scheduled run for the first time.|

=============== FILE: reports/legacy-import-operator-breakdown.md ===============
# legacy-import — run 2026-09-06, 12,480 mutations, 7,862 survivors

Report output, in the order the tool prints it. No grouping applied.

| operator                                  | generated | survived |
|-------------------------------------------|-----------|----------|
| ConditionalsBoundaryMutator               | 630       | 264      |
| IncrementsMutator                         | 288       | 93       |
| InvertNegsMutator                         | 132       | 57       |
| MathMutator                               | 564       | 222      |
| NegateConditionalsMutator                 | 1,206     | 513      |
| VoidMethodCallMutator                     | 1,065     | 786      |
| EmptyReturnsMutator                       | 570       | 183      |
| FalseReturnsMutator                       | 363       | 132      |
| TrueReturnsMutator                        | 354       | 141      |
| NullReturnsMutator                        | 468       | 189      |
| PrimitiveReturnsMutator                   | 423       | 156      |
| InlineConstantMutator                     | 1,860     | 1,536    |
| RemoveConditionalMutator                  | 1,764     | 1,323    |
| RemoveIncrementsMutator                   | 288       | 234      |
| NakedReceiverMutator                      | 630       | 564      |
| ConstructorCallMutator                    | 522       | 423      |
| NonVoidMethodCallMutator                  | 1,014     | 740      |
| ExperimentalArgumentPropagationMutator    | 339       | 306      |

=============== FILE: reports/legacy-import-survivors-sample.md ===============
# legacy-import — 16 survivors sampled at random from 7,862, pulled 2026-08-14

Report output plus the source line the mutation sits on. No classification
applied. Source for `RowParser` and `LegacyCharset` is attached; `BalanceCheck`,
`AmountCodec`, `StatementReader` and `ArchiveReader` are not.

| #  | operator                               | location                | source line                                                    |
|----|----------------------------------------|-------------------------|----------------------------------------------------------------|
| 1  | VoidMethodCallMutator                  | RowParser.java:28       | `log.fine("parsed " + out.size() + " columns, skipped " + skipped);` |
| 2  | RemoveIncrementsMutator                | RowParser.java:26       | `skipped++;`                                                    |
| 3  | NonVoidMethodCallMutator               | RowParser.java:19       | `Objects.requireNonNull(raw, "raw");`                           |
| 4  | InlineConstantMutator                  | RowParser.java:20       | `int width = Math.max(1, columns);`                             |
| 5  | ConditionalsBoundaryMutator            | RowParser.java:25       | `if (raw.length() > LONG_ROW) {`                                |
| 6  | ConstructorCallMutator                 | RowParser.java:34       | `throw new ParseException("no column " + index);`               |
| 7  | NakedReceiverMutator                   | RowParser.java:36       | `return row.get(index).trim();`                                 |
| 8  | VoidMethodCallMutator                  | LegacyCharset.java:15   | `log.finest("canonicalising " + token);`                        |
| 9  | NakedReceiverMutator                   | LegacyCharset.java:20   | `return token.trim().toUpperCase(Locale.ROOT);`                 |
| 10 | NegateConditionalsMutator              | BalanceCheck.java:40    | `if (declared.equals(computed)) {`                              |
| 11 | MathMutator                            | AmountCodec.java:22     | `return debit ? -value : value;`                                |
| 12 | PrimitiveReturnsMutator                | AmountCodec.java:41     | `return scale;`                                                 |
| 13 | NullReturnsMutator                     | StatementReader.java:64 | `return statement;`                                             |
| 14 | ExperimentalArgumentPropagationMutator | StatementReader.java:88 | `log.fine("read " + n + " rows");`                              |
| 15 | NegateConditionalsMutator              | ArchiveReader.java:210  | `if (entry.isDirectory()) {`                                    |
| 16 | MathMutator                            | ArchiveReader.java:233  | `offset = offset + header.size();`                              |

=============== FILE: src/main/java/com/acme/legacyimport/RowParser.java ===============
package com.acme.legacyimport;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.logging.Logger;

public class RowParser {

    private static final Logger log = Logger.getLogger(RowParser.class.getName());
    private static final int LONG_ROW = 132;

    private int skipped;

    public List<String> parse(String raw, int columns) {
        if (raw == null) {
            throw new ParseException("row is null");
        }
        Objects.requireNonNull(raw, "raw");
        int width = Math.max(1, columns);
        List<String> out = new ArrayList<>();
        for (int i = 0; i < raw.length(); i += width) {
            out.add(raw.substring(i, Math.min(raw.length(), i + width)));
        }
        if (raw.length() > LONG_ROW) {
            skipped++;
        }
        log.fine("parsed " + out.size() + " columns, skipped " + skipped);
        return out;
    }

    public String field(List<String> row, int index) {
        if (index < 0 || index >= row.size()) {
            throw new ParseException("no column " + index);
        }
        return row.get(index).trim();
    }
}

=============== FILE: src/main/java/com/acme/legacyimport/LegacyCharset.java ===============
package com.acme.legacyimport;

import java.util.Locale;
import java.util.logging.Logger;

public final class LegacyCharset {

    private static final Logger log = Logger.getLogger(LegacyCharset.class.getName());

    private LegacyCharset() {
    }

    public static String canonical(String raw) {
        String token = raw.trim();
        log.finest("canonicalising " + token);
        return normalise(token);
    }

    private static String normalise(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
