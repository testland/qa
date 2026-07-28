# Grounding - verbatim source quotations

The SKILL.md spine cites these sections with one-line summaries. The full
quotations are kept here.

## §EP - equivalence partitioning (CTFL v4.0.1 §4.2.1, page 39)

Source: ISTQB Certified Tester Foundation Level syllabus v4.0.1
([PDF](https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).

The coverage criterion: "In EP, the coverage items are the equivalence
partitions. To achieve 100% coverage with this test technique, test cases must
exercise all identified partitions (including invalid partitions) by covering
each partition at least once."

Each Choice coverage, for entry points with several parameters: "requires test
cases to exercise each partition from each set of partitions at least once", and
it "does not take into account combinations of partitions".

The coverage formula: partitions exercised by at least one test case, divided by
total partitions identified, expressed as a percentage.
[Coverage](https://glossary.istqb.org/en_US/term/coverage) is "the degree to
which specified coverage items are exercised by a test suite, expressed as a
percentage".

## §BVA - boundary value analysis (CTFL v4.0.1 §4.2.2, page 40)

The scope rule: BVA "is a test technique based on exercising the boundaries of
equivalence partitions. Therefore, BVA can only be used for ordered
partitions."

2-value BVA: "In 2-value BVA, for each boundary value there are two coverage
items: this boundary value and its closest neighbor belonging to the adjacent
partition. To achieve 100% coverage with 2-value BVA, test cases must exercise
all coverage items."

3-value BVA, the stricter bar: "for each boundary value there are three coverage
items: this boundary value and both its neighbors", which adds `min+1` and
`max-1` to the required set.

## §NEG - AI test-generation survey stat

An industry survey found 70% of teams use AI for test-case creation but only
19.9% for risk identification, with 40.7% of adopters citing "more diverse and
complex test cases" as a benefit
([PractiTest State of Testing](https://www.practitest.com/state-of-testing/)).
Generating more cases is not the same as widening the input domain.
