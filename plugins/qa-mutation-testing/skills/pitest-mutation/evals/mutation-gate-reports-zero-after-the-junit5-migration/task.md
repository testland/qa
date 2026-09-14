# Mutation gate reports 0% while 214 tests pass

## Problem Description

`billing-core` finished its JUnit 4 to JUnit 5 migration and the module deploys
fine to staging. `mvn test` runs 214 tests, zero failures.

The mutation job on `main` has been red since the migration merged. It reports
0% and fails the 70 gate that has been in place since February. I have attached
last night's console output, the surefire summary from the same build, the last
report we have from before the migration, the current `pom.xml`, the class the
report is about and its test, and the list of config changes that have landed on
that pom this month.

Three things have been proposed and I have to pick one by Thursday:

- Yuki has a contractor lined up who quoted three weeks to "rebuild the test
  coverage the migration lost", and she wants the PO raised on Monday. She
  points out that the tool is telling us 0% and that we should believe our
  instruments.
- Dariusz widened what we point the tool at. That change is already merged to
  `main` — the run now reports 1,103 mutations instead of 587 and the log fills
  up with `InvoiceServiceTest`, which he reads as progress.
- My manager has offered to set the gate to 0 until this settles down.

We get audited on our own quality gates in three weeks, so whatever I do on
Thursday is going to be looked at. I need the job green and I need to know it is
green because it is measuring something, not because I turned the gate off.

## Output Specification

1. Edit the supplied `pom.xml` so that `mvn pitest:mutationCoverage` measures the
   existing suite against the production classes and the build passes. Change
   only what the fix requires; leave everything else in the pom alone.
2. Write `docs/mutation-gate-incident.md` — what the 0% actually means, which
   attached evidence settles it, an explicit verdict on each of the three
   proposals above, and the numbers you expect the next run to print together
   with whether it goes green.
3. Do not modify `InvoiceService.java` or `InvoiceServiceTest.java`, and do not
   add tests — there is no time for new tests before Thursday.

## Input Files

Extract the following files before beginning.

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>billing-core</artifactId>
  <version>4.2.1-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.pitest</groupId>
      <artifactId>pitest-junit5-plugin</artifactId>
      <version>1.2.1</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
      </plugin>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>1.17.0</version>
        <configuration>
          <targetClasses>
            <param>com.acme.billing.*</param>
            <param>com.acme.billing.*Test</param>
          </targetClasses>
          <targetTests>
            <param>com.acme.billing.*Test</param>
          </targetTests>
          <mutationThreshold>70</mutationThreshold>
          <coverageThreshold>95</coverageThreshold>
          <outputFormats>
            <format>HTML</format>
            <format>XML</format>
          </outputFormats>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: reports/pom-config-changes-september.md ===============
# billing-core — changes to pom.xml this month

| date       | PR    | who     | what                                                                 |
|------------|-------|---------|----------------------------------------------------------------------|
| 2026-09-03 | #8841 | team    | JUnit 5 migration merged. Test sources moved to the Jupiter API.      |
| 2026-09-08 | #8859 | D.K.    | Widened the mutated set so the run would stop saying it sees nothing. |
| 2026-09-09 | #8863 | Y.M.    | Raised `coverageThreshold` from 75 to 95 for QUAL-712 (audit prep).   |

QUAL-712 is a tracker-wide ticket asking every module to tighten its coverage
gate before the October audit. It was applied to eleven modules the same
afternoon. Nothing in `src/main` has changed since 2026-08-28 apart from a
javadoc typo.

=============== FILE: reports/pit-console-2026-09-10.txt ===============
[INFO] --- pitest:1.17.0:mutationCoverage (default-cli) @ billing-core ---
[INFO] Found 1 test classes on classpath scan
[INFO] Sending 0 tests to minion
================================================================================
- Statistics
================================================================================
>> Line Coverage (for mutated classes only): 0/402 (0%)
>> Generated 1103 mutations Killed 0 (0%)
>> Mutations with no coverage 1103. Test strength 0%
>> Ran 0 tests (0.00 tests per mutation)

================================================================================
- Mutators
================================================================================
> org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator
>> Generated 77 Killed 0 (0%)
> org.pitest.mutationtest.engine.gregor.mutators.ReturnValsMutator
>> Generated 331 Killed 0 (0%)
> org.pitest.mutationtest.engine.gregor.mutators.MathMutator
>> Generated 168 Killed 0 (0%)
> org.pitest.mutationtest.engine.gregor.mutators.VoidMethodCallMutator
>> Generated 186 Killed 0 (0%)
> org.pitest.mutationtest.engine.gregor.mutators.NegateConditionalsMutator
>> Generated 341 Killed 0 (0%)

[ERROR] Failed to execute goal org.pitest:pitest-maven:1.17.0:mutationCoverage
[ERROR]   (default-cli) on project billing-core: Mutation score of 0 is below
[ERROR]   the threshold of 70

=============== FILE: reports/surefire-summary-2026-09-10.txt ===============
[INFO] --- surefire:3.2.5:test (default-test) @ billing-core ---
[INFO] Running com.acme.billing.InvoiceServiceTest
[INFO] Tests run: 214, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.911 s
[INFO]
[INFO] Results:
[INFO] Tests run: 214, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

=============== FILE: reports/pit-summary-2026-08-28-pre-migration.txt ===============
# Last run before the JUnit 5 migration (build 4471, junit 4.13.2 + surefire 3.2.5)
# Gates in force for this run: mutationThreshold 70, coverageThreshold 75.

>> Line Coverage (for mutated classes only): 139/148 (94%)
>> Generated 587 mutations Killed 417 (71%)
>> Mutations with no coverage 22. Test strength 74%
>> Ran 2,981 tests (5.08 tests per mutation)

Survivors at the time: 148, mostly VoidMethodCallMutator on the audit-log
calls, plus the free-shipping boundary in InvoiceService. Build passed with one
point of headroom on the mutation gate.

Line coverage for this module has sat between 93% and 94% for the whole of 2026
— the nine uncovered lines are the IOException arms in the PDF renderer, which
nobody has been able to trigger from a unit test.

=============== FILE: src/main/java/com/acme/billing/InvoiceService.java ===============
package com.acme.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class InvoiceService {

    private static final BigDecimal FREE_SHIPPING_FROM = new BigDecimal("50.00");
    private static final BigDecimal SHIPPING_FLAT = new BigDecimal("4.95");

    public BigDecimal shipping(BigDecimal subtotal) {
        if (subtotal.compareTo(FREE_SHIPPING_FROM) >= 0) {
            return BigDecimal.ZERO;
        }
        return SHIPPING_FLAT;
    }

    public BigDecimal vat(BigDecimal net, int ratePercent) {
        if (ratePercent < 0 || ratePercent > 27) {
            throw new IllegalArgumentException("rate out of range: " + ratePercent);
        }
        return net.multiply(BigDecimal.valueOf(ratePercent))
                  .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public BigDecimal total(BigDecimal subtotal, int ratePercent) {
        BigDecimal net = subtotal.add(shipping(subtotal));
        return net.add(vat(net, ratePercent)).setScale(2, RoundingMode.HALF_UP);
    }
}

=============== FILE: src/test/java/com/acme/billing/InvoiceServiceTest.java ===============
package com.acme.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class InvoiceServiceTest {

    private final InvoiceService service = new InvoiceService();

    @Test
    void chargesFlatShippingBelowTheFreeThreshold() {
        assertEquals(new BigDecimal("4.95"), service.shipping(new BigDecimal("49.99")));
    }

    @Test
    void shipsFreeAboveTheThreshold() {
        assertEquals(BigDecimal.ZERO, service.shipping(new BigDecimal("50.01")));
    }

    @ParameterizedTest
    @CsvSource({"100.00, 20, 20.00", "100.00, 0, 0.00", "33.33, 27, 9.00"})
    void computesVat(String net, int rate, String expected) {
        assertEquals(new BigDecimal(expected), service.vat(new BigDecimal(net), rate));
    }

    @Test
    void rejectsRatesOutsideTheLegalRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), 28));
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), -1));
    }

    @Test
    void totalsSubtotalShippingAndVat() {
        assertEquals(new BigDecimal("65.94"), service.total(new BigDecimal("50.00"), 20));
    }
}
