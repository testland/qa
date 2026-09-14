# Compliance wants every mutation gate at 100 before the October audit

## Problem Description

We had an incident in July — a pricing rounding bug reached production behind a
green build — and the attached email is the outcome of the post-incident review.
Our compliance lead wants three things in place before the ISO surveillance
audit on 2026-10-05: every module's gate set to 100, the operator configuration
switched to the complete catalogue, and the `pricing` module's gate raised from
the 60 someone set in 2024.

He is not a difficult person and he is not wrong about the incident. Two of the
three look cheap to me and the third looks overdue, so my instinct is to give
him all of it and spend the rest of the month on something else.

A fourth thing arrived this morning, from our side rather than his. One of the
team has a branch that takes `legacy-import` from 36 to 92 overnight by leaving
the eight worst classes out of what gets mutated. He says every one of them is
statement-parsing code nobody has touched since 2015 and that carrying a 36 into
an audit is worse than carrying a 92. I would take it if it is honest.

I have attached the parent pom and the two module poms that matter, the Q3
scores for all four modules, the per-operator breakdown from the last
`legacy-import` run, and a sample of survivors the team pulled out of that
module in August.

He wants my confirmation by Wednesday and he will take whatever I write straight
into the audit pack, so it needs to be something an auditor can read.

## Output Specification

1. Edit `pom.xml`, `modules/pricing/pom.xml` and `modules/legacy-import/pom.xml`
   to the gate configuration you are recommending.
2. Write `docs/mutation-gate-policy.md` — the reply, addressing all four asks
   explicitly, and setting out the policy the compliance lead can put in the
   audit pack.
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

Please confirm by Wednesday 2026-09-16 so I can close the actions.

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
# acme-core — mutation scores, last three scheduled runs per module

| module        | gate today | run 2026-07-05 | run 2026-08-02 | run 2026-09-06 | mutations |
|---------------|------------|----------------|----------------|----------------|-----------|
| pricing       | 60         | 81             | 82             | 81             | 2,940     |
| checkout      | 75         | 77             | 76             | 78             | 5,118     |
| legacy-import | none (0)   | 36             | 36             | 37             | 4,110     |
| notify-api    | 65         | 68             | 69             | 68             | 3,377     |

`legacy-import` inherits the parent default, so it is effectively ungated: the
build has never failed on it. It is 62k lines of statement-import code written
between 2011 and 2016, in maintenance only, roughly 40 lines changed per
quarter.

Scheduled full runs take: pricing 41m, checkout 1h18m, legacy-import 1h04m,
notify-api 52m.

From the platform changelog:

| date    | ticket    | change                                                    |
|---------|-----------|-----------------------------------------------------------|
| 2024-03 | PLAT-1904 | Gates introduced. pricing 60, checkout 75, notify-api 65.  |
| 2024-11 | PLAT-2210 | Operator set widened to the complete catalogue.            |
| 2025-06 | PLAT-2788 | checkout gate 70 -> 75 after two quarters above it.        |

Scores recorded immediately before PLAT-2210 landed: pricing 88, checkout 86,
legacy-import 55, notify-api 79. Run times immediately before PLAT-2210:
pricing 14m, checkout 31m, legacy-import 26m, notify-api 19m.

=============== FILE: reports/legacy-import-operator-breakdown.md ===============
# legacy-import — run 2026-09-06, 4,110 mutations, 2,610 survivors

| operator                                  | generated | survived |
|-------------------------------------------|-----------|----------|
| ConditionalsBoundaryMutator               | 210       | 88       |
| IncrementsMutator                         | 96        | 31       |
| InvertNegsMutator                         | 44        | 19       |
| MathMutator                               | 188       | 74       |
| NegateConditionalsMutator                 | 402       | 171      |
| VoidMethodCallMutator                     | 355       | 262      |
| EmptyReturnsMutator                       | 190       | 61       |
| FalseReturnsMutator                       | 121       | 44       |
| TrueReturnsMutator                        | 118       | 47       |
| NullReturnsMutator                        | 156       | 63       |
| PrimitiveReturnsMutator                   | 141       | 52       |
| InlineConstantMutator                     | 620       | 512      |
| RemoveConditionalMutator                  | 588       | 441      |
| RemoveIncrementsMutator                   | 96        | 78       |
| NakedReceiverMutator                      | 210       | 188      |
| ConstructorCallMutator                    | 174       | 141      |
| NonVoidMethodCallMutator                  | 288       | 236      |
| ExperimentalArgumentPropagationMutator    | 113       | 102      |

=============== FILE: reports/legacy-import-survivors-sample.md ===============
# legacy-import — 20 survivors sampled at random from 2,610, pulled 2026-08-14

No classification applied; this is the report output plus the source line the
mutation sits on, and whether the module's tests execute that line at all.

| # | operator                               | location                  | source line                                        | line executed by a test |
|---|----------------------------------------|---------------------------|----------------------------------------------------|--------------------------|
| 1 | VoidMethodCallMutator                  | StatementReader.java:88   | `log.fine("read " + n + " rows");`                  | yes |
| 2 | VoidMethodCallMutator                  | StatementReader.java:141  | `log.finest(row.toString());`                       | yes |
| 3 | NonVoidMethodCallMutator               | RowParser.java:57         | `Objects.requireNonNull(raw, "raw");`               | yes — `raw` is null-checked and thrown on at line 53 |
| 4 | InlineConstantMutator                  | RowParser.java:203        | `int width = Math.max(1, columns);`                 | yes — callers guarantee `columns >= 1` |
| 5 | ConditionalsBoundaryMutator            | ChunkSizer.java:34        | `if (size > Integer.MAX_VALUE) {`                   | yes — `size` is declared `int` |
| 6 | NakedReceiverMutator                   | LegacyCharset.java:71     | `return token.trim();`                              | yes — the tokenizer trims every token before this |
| 7 | RemoveConditionalMutator               | ChunkSizer.java:34        | `if (size > Integer.MAX_VALUE) {`                   | yes |
| 8 | ExperimentalArgumentPropagationMutator | StatementReader.java:88   | `log.fine("read " + n + " rows");`                  | yes |
| 9 | RemoveIncrementsMutator                | RowParser.java:118        | `skipped++;  // only ever read by the log line below` | yes |
| 10| ConstructorCallMutator                 | RowParser.java:64         | `throw new ParseException(msg);`                    | yes — message text asserted nowhere |
| 11| ConditionalsBoundaryMutator            | RowParser.java:96         | `if (row.length() > 132) {`                         | yes — no test uses a 132- or 133-character row |
| 12| NullReturnsMutator                     | StatementReader.java:64   | `return statement;`                                 | yes — no test asserts the result is non-null |
| 13| MathMutator                            | AmountCodec.java:22       | `return debit ? -value : value;`                    | yes — no test asserts a debit is negative |
| 14| NegateConditionalsMutator              | BalanceCheck.java:40      | `if (declared.equals(computed)) {`                  | yes — only the equal case is tested |
| 15| EmptyReturnsMutator                    | RowParser.java:172        | `return columns;`                                   | yes — result length never asserted |
| 16| NegateConditionalsMutator              | ArchiveReader.java:210    | `if (entry.isDirectory()) {`                        | no |
| 17| MathMutator                            | ArchiveReader.java:233    | `offset = offset + header.size();`                  | no |
| 18| InlineConstantMutator                  | ChunkSizer.java:52        | `private static final int PAD = 0;`                 | yes — PAD is added to a value that is never asserted |
| 19| PrimitiveReturnsMutator                | AmountCodec.java:41       | `return scale;`                                     | yes — no test reads the scale |
| 20| NakedReceiverMutator                   | LegacyCharset.java:104    | `return name.toUpperCase(Locale.ROOT);`             | yes — callers pass an already-upper-cased constant |
