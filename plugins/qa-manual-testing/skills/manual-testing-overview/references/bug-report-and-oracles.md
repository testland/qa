# Bug-report fields and oracles

Deep reference for `manual-testing-overview` SKILL.md. The body carries the
condensed bug-report example; this file holds the full field list and the
oracle set.

## Report contents (ISTQB CTFL v4.0.1 §5.5, pp.56-57)

A defect report logged during dynamic testing should carry
([ISTQB CTFL Syllabus v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)):

- Unique identifier.
- Title summarizing the anomaly.
- Date observed, and author.
- The test object and test environment.
- Context: the test case, activity, technique, or data in use.
- A description of the failure "to enable reproduction and resolution
  including the test steps that detected the anomaly, and any relevant
  test logs, database dumps, screenshots, or recordings".
- Expected and actual results.
- Severity, priority, status.
- References.

ISO/IEC/IEEE 29119-3 carries templates for the same thing and calls them
incident reports.

## Oracles (Bolton M., "FEW HICCUPPS", DevelopSense, 2012)

An oracle is "a way of recognizing a problem". When you are unsure
something is even a defect, name the expectation it violates. Each of
these inconsistencies gives a concrete reason to argue the bug:

- History - the product's own past behavior.
- Claims - what the organization said the product would do.
- Comparable products - how similar products behave.
- Users' desires - what a reasonable user wants.
- The product itself - internal consistency across its parts.
- Its purpose - the product's intended use.
- Standards - relevant standards and conventions.

The full FEW HICCUPPS mnemonic and each oracle in depth is in
`hiccupps-f-heuristic`.
