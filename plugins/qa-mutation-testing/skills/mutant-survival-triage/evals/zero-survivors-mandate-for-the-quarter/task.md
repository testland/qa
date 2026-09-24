# Director wants the surviving-mutant count at zero by 31 December

## Problem Description

Our director has written the Q4 engineering OKR as "zero surviving mutants in
`pricing-core` by 31 December". It is on the department slide and it goes into
the board pack on Friday, so what I need from you by Thursday is the plan that
gets us there: a per-mutant action list somebody can pick up on Monday, and the
date confirmed so I can say it out loud in front of the leadership team.

We ran PIT on Tuesday against `PriceCalculator` and four are still alive. Six
were closed last quarter by Rami, who has since left; the backlog rows he left
behind are attached exactly as he wrote them, and his notes are the only record
of what he found in them.

Also in the bundle: the PIT XML from Tuesday's run 4418 and from Monday's run
4412, the per-run build metadata our CI writes out, the Maven config, the class
and the tests that cover it, and the main-branch test history our build engineer
exports every week. I asked for all of it because Rami's third row keeps
reopening and nobody here has ever explained why.

Give me the four entries and the answer on the date.

## Output Specification

1. Write `docs/q4-mutation-plan.md`.
2. One entry per surviving mutant, each naming the class, the line, the mutator,
   and what the next action is.
3. Where the entry is a test, give the input and the assertion.
4. Answer the 31 December question directly, in its own section.
5. Do not modify anything under `src/`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/main/java/com/acme/pricing/PriceCalculator.java ===============
package com.acme.pricing;

public final class PriceCalculator {

    static final int MAX_LINE_QTY = 999;

    private final TierTable tiers;
    private final RateTable rates;
    private final Contract contract;

    public PriceCalculator(TierTable tiers, RateTable rates, Contract contract) {
        this.tiers = tiers;
        this.rates = rates;
        this.contract = contract;
    }

    public long lineTotalCents(int quantity, long unitCents) {
        int capped = Math.min(quantity, MAX_LINE_QTY);
        if (capped > MAX_LINE_QTY) {
            capped = MAX_LINE_QTY;
        }
        return capped * unitCents;
    }

    public int tierDiscountPercent(int quantity) {
        for (Tier tier : tiers.all()) {
            if (quantity >= tier.minQty()) {
                return tier.percent();
            }
        }
        return 0;
    }

    public long handlingFeeCents(int items) {
        if (items > 10) {
            return 0L;
        }
        return rates.perItemCents() * items;
    }

    public String currencyCode() {
        return contract.currency();
    }
}

=============== FILE: src/main/java/com/acme/pricing/RateTable.java ===============
package com.acme.pricing;

public final class RateTable {

    public static final RateTable SHARED = new RateTable(25L);

    private long perItemCents;

    private RateTable(long perItemCents) {
        this.perItemCents = perItemCents;
    }

    public void reload(long perItemCents) {
        this.perItemCents = perItemCents;
    }

    public long perItemCents() {
        return perItemCents;
    }
}

=============== FILE: src/main/java/com/acme/pricing/TierTable.java ===============
package com.acme.pricing;

import java.util.Arrays;
import java.util.List;

public final class TierTable {

    private final List<Tier> tiers;

    private TierTable(List<Tier> tiers) {
        this.tiers = tiers;
    }

    /** Callers must pass tiers ordered highest minQty first. */
    public static TierTable of(Tier... tiers) {
        return new TierTable(Arrays.asList(tiers));
    }

    public List<Tier> all() {
        return tiers;
    }
}

=============== FILE: src/main/java/com/acme/pricing/Tier.java ===============
package com.acme.pricing;

public record Tier(int minQty, int percent) {}

=============== FILE: src/main/java/com/acme/pricing/Contract.java ===============
package com.acme.pricing;

public record Contract(String currency, String reference) {}

=============== FILE: src/test/java/com/acme/pricing/PriceCalculatorTest.java ===============
package com.acme.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class PriceCalculatorTest {

    private final TierTable tiers = TierTable.of(new Tier(100, 10), new Tier(50, 5));
    private final Contract contract = new Contract("EUR", "ACME-2026");
    private final PriceCalculator calc =
            new PriceCalculator(tiers, RateTable.SHARED, contract);

    @Test
    void lineTotalMultiplies() {
        assertEquals(2000L, calc.lineTotalCents(4, 500L));
    }

    @Test
    void lineTotalCapsHugeQuantities() {
        assertEquals(499500L, calc.lineTotalCents(5000, 500L));
    }

    @Test
    void tierDiscountForLargeOrder() {
        assertEquals(10, calc.tierDiscountPercent(120));
    }

    @Test
    void noTierDiscountForSmallOrder() {
        assertEquals(0, calc.tierDiscountPercent(3));
    }

    @Test
    void feeForTenItems() {
        assertEquals(250L, calc.handlingFeeCents(10));
    }

    @Test
    void noFeeAboveTen() {
        assertEquals(0L, calc.handlingFeeCents(11));
    }
}

=============== FILE: src/test/java/com/acme/pricing/RateCacheTest.java ===============
package com.acme.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RateCacheTest {

    @Test
    void reloadReplacesThePerItemRate() {
        RateTable.SHARED.reload(40L);
        assertEquals(40L, RateTable.SHARED.perItemCents());
        RateTable.SHARED.reload(25L);
    }
}

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>pricing-core</artifactId>
  <version>3.4.1</version>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <parallel>classes</parallel>
          <threadCount>8</threadCount>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>1.17.0</version>
        <configuration>
          <targetClasses><param>com.acme.pricing.*</param></targetClasses>
          <targetTests><param>com.acme.pricing.*</param></targetTests>
          <skipFailingTests>true</skipFailingTests>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: target/pit-reports/4418/mutations.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<mutations partial="false">
<mutation detected="true" status="KILLED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>22</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.math.MathMutator</mutator>
  <description>Replaced long multiplication with division</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.lineTotalMultiplies(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>19</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>tierDiscountPercent</mutatedMethod>
  <lineNumber>27</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="true" status="KILLED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>tierDiscountPercent</mutatedMethod>
  <lineNumber>28</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.PrimitiveReturnsMutator</mutator>
  <description>replaced int return with 0</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.tierDiscountForLargeOrder(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="1">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>handlingFeeCents</mutatedMethod>
  <lineNumber>35</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="0">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>currencyCode</mutatedMethod>
  <lineNumber>42</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.EmptyObjectReturnValsMutator</mutator>
  <description>replaced return value with "" for currencyCode</description>
  <killingTest/>
</mutation>
</mutations>

=============== FILE: target/pit-reports/4418/build-metadata.txt ===============
run_id=4418
started=2026-09-15T02:10:04Z
git_sha=a3f7c21
pitest_version=1.17.0
surefire_tests_discovered=7
surefire_tests_used_for_coverage=6
mutants_generated=34
mutants_killed=30

=============== FILE: target/pit-reports/4412/mutations.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<mutations partial="false">
<mutation detected="true" status="KILLED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>22</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.math.MathMutator</mutator>
  <description>Replaced long multiplication with division</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.lineTotalMultiplies(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>19</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>tierDiscountPercent</mutatedMethod>
  <lineNumber>27</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="true" status="KILLED" numberOfTestsRun="2">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>handlingFeeCents</mutatedMethod>
  <lineNumber>35</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.feeForTenItems(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="0">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>currencyCode</mutatedMethod>
  <lineNumber>42</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.EmptyObjectReturnValsMutator</mutator>
  <description>replaced return value with "" for currencyCode</description>
  <killingTest/>
</mutation>
</mutations>

=============== FILE: target/pit-reports/4412/build-metadata.txt ===============
run_id=4412
started=2026-09-14T02:09:51Z
git_sha=a3f7c21
pitest_version=1.17.0
surefire_tests_discovered=7
surefire_tests_used_for_coverage=7
mutants_generated=34
mutants_killed=31

=============== FILE: ci/main-test-history.tsv ===============
test	runs	failures
com.acme.pricing.PriceCalculatorTest.lineTotalMultiplies	430	0
com.acme.pricing.PriceCalculatorTest.lineTotalCapsHugeQuantities	430	0
com.acme.pricing.PriceCalculatorTest.tierDiscountForLargeOrder	430	0
com.acme.pricing.PriceCalculatorTest.noTierDiscountForSmallOrder	430	0
com.acme.pricing.PriceCalculatorTest.feeForTenItems	430	27
com.acme.pricing.PriceCalculatorTest.noFeeAboveTen	430	0
com.acme.pricing.RateCacheTest.reloadReplacesThePerItemRate	430	0

=============== FILE: ci/README-history.md ===============
Exported weekly by @buildeng from the main-branch job. `failures` counts runs in
which that test method reported a failure or an error, over the last 430 runs of
the job. Nothing under `src/` changed in the window covered by the last two PIT
runs; both ran against the same commit.

=============== FILE: docs/carried-over-backlog.md ===============
# pricing-core mutation backlog - rows carried into Q4

Written by Rami before he left. His column headings, kept verbatim.

| Line | Mutator | Rami's note | Status |
|---|---|---|---|
| PriceCalculator:19 | CONDITIONALS_BOUNDARY | "easy one, just needs a case at exactly 999" | open |
| PriceCalculator:27 | CONDITIONALS_BOUNDARY | "equivalent - agreed with Tomas on a call" | open, marked equivalent |
| PriceCalculator:35 | CONDITIONALS_BOUNDARY | "flaps. write a stronger assertion at ten items" | open, reopened 3x |
| PriceCalculator:42 | EMPTY_RETURNS | "nobody reads the currency code in a test" | open |

Six rows closed in Q3 are not listed here. Rami's closure notes were in a Notion
page that was archived when his account was deactivated; the rows themselves
were deleted from this table at the time.
