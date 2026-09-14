# Director wants the surviving-mutant count at zero by 31 December

## Problem Description

Our director has written the Q4 engineering OKR as "zero surviving mutants in
`pricing-core` by 31 December" and it is already on the department slide. We ran
PIT on Tuesday against `PriceCalculator` and four are still alive. Six were
closed last quarter by Rami, who has since left, and the backlog rows he left
behind are attached exactly as he wrote them.

I have to come back on Thursday with two things: a per-mutant action list that
someone can actually work, and a straight answer on whether 31 December is a
date I can commit to in front of the leadership team. I would rather be told now
that the target is the wrong shape than discover it in week eleven.

Attached: the PIT XML from run 4418, the class under test, the test class, the
carried-over backlog rows, and the CI note our build engineer sent about one of
the four, which I do not fully follow.

Give me the four entries and the answer on the date. Where an entry is not work
for the test suite, say what it is instead, and be specific enough that I can put
a name and a next step on it.

## Output Specification

1. Write `docs/q4-mutation-plan.md`.
2. One entry per surviving mutant, each naming the class, the line, the mutator,
   and what the right next action is.
3. Where the next action is a test, give the input and the assertion. Where it is
   not a test, say what it is and who does it.
4. Answer the 31 December question directly, in its own section.
5. Do not modify anything under `src/`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/main/java/com/acme/pricing/PriceCalculator.java ===============
package com.acme.pricing;

import java.util.List;

public final class PriceCalculator {

    static final int MAX_LINE_QTY = 999;

    private final TierTable tiers;
    private final Contract contract;

    public PriceCalculator(TierTable tiers, Contract contract) {
        this.tiers = tiers;
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
        return 25L * items;
    }

    public String currencyCode() {
        return contract.currency();
    }
}

=============== FILE: src/test/java/com/acme/pricing/PriceCalculatorTest.java ===============
package com.acme.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class PriceCalculatorTest {

    // tiers are ordered highest minQty first, as TierTable.of requires
    private final TierTable tiers = TierTable.of(new Tier(100, 10), new Tier(50, 5));
    private final Contract contract = new Contract("EUR", "ACME-2026");
    private final PriceCalculator calc = new PriceCalculator(tiers, contract);

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

=============== FILE: target/pit-reports/4418/mutations.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<mutations partial="false">
<mutation detected="true" status="KILLED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>22</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.math.MathMutator</mutator>
  <description>Replaced long multiplication with division</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.lineTotalMultiplies(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>lineTotalCents</mutatedMethod>
  <lineNumber>19</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>tierDiscountPercent</mutatedMethod>
  <lineNumber>27</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="true" status="KILLED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>tierDiscountPercent</mutatedMethod>
  <lineNumber>28</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.PrimitiveReturnsMutator</mutator>
  <description>replaced int return with 0</description>
  <killingTest>com.acme.pricing.PriceCalculatorTest.tierDiscountForLargeOrder(PriceCalculatorTest)</killingTest>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>handlingFeeCents</mutatedMethod>
  <lineNumber>35</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.ConditionalsBoundaryMutator</mutator>
  <description>changed conditional boundary</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="SURVIVED" numberOfTestsRun="6">
  <sourceFile>PriceCalculator.java</sourceFile>
  <mutatedClass>com.acme.pricing.PriceCalculator</mutatedClass>
  <mutatedMethod>currencyCode</mutatedMethod>
  <lineNumber>42</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.EmptyObjectReturnValsMutator</mutator>
  <description>replaced return value with "" for currencyCode</description>
  <killingTest/>
</mutation>
<mutation detected="false" status="NO_COVERAGE" numberOfTestsRun="0">
  <sourceFile>Contract.java</sourceFile>
  <mutatedClass>com.acme.pricing.Contract</mutatedClass>
  <mutatedMethod>toString</mutatedMethod>
  <lineNumber>31</lineNumber>
  <mutator>org.pitest.mutationtest.engine.gregor.mutators.returns.EmptyObjectReturnValsMutator</mutator>
  <description>replaced return value with "" for toString</description>
  <killingTest/>
</mutation>
</mutations>

=============== FILE: docs/carried-over-backlog.md ===============
# pricing-core mutation backlog - rows carried into Q4

Written by Rami before he left. His column headings, kept verbatim.

| Line | Mutator | Rami's note | Status |
|---|---|---|---|
| PriceCalculator:19 | CONDITIONALS_BOUNDARY | "clamp guard, can't see how a test would ever tell the difference" | open |
| PriceCalculator:27 | CONDITIONALS_BOUNDARY | "equivalent - agreed with Tomas on a call" | open, marked equivalent |
| PriceCalculator:35 | CONDITIONALS_BOUNDARY | "keeps coming back, we already have a test for ten items?!" | open, reopened 3x |
| PriceCalculator:42 | EMPTY_RETURNS | "nobody reads the currency code in a test" | open |

Six rows closed in Q3 are not listed here. Rami's closure notes were in a Notion
page that was archived when his account was deactivated; the rows themselves
were deleted from this table at the time.

=============== FILE: notes/build-engineer-note.md ===============
From: @buildeng (Priya)
Subject: PriceCalculator:35 again

Ran the numbers you asked for. PIT run 4412 on Monday reported
PriceCalculator:35 as KILLED. Run 4418 on Tuesday reports it SURVIVED. The two
runs are on the same commit - a3f7c21 both times, I checked the job metadata
twice, and nothing under src/ changed between them.

Other thing you should know: `PriceCalculatorTest.feeForTenItems` is on our flake
board. It has failed 27 of the last 430 runs on main (6.3%) with no pattern by
agent or time of day. It shares a static TierTable instance with
`TierCacheTest`, and we run the suite with `-Dparallel=classes`. Ticket is
BLD-1180, unowned since August.

I do not know what any of that means for your mutation numbers. You asked for
the run history, so there it is.
