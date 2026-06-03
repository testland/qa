---
name: defect-taxonomy-istqb
description: "Pure-reference catalog of defect categorisation taxonomies. Covers the IEEE 1044-2009 anomaly classification (anomaly class, anomaly type, anomaly severity, root cause category), the ISTQB CTAL-TA root-cause taxonomy (requirements / design / implementation / interface / test-data / build-environment), and the Orthogonal Defect Classification (ODC) eight-attribute framework. Maps each taxonomy to a worked example showing how the same defect classifies under each. Use to categorise defects consistently across a team, drive root-cause analysis, and inform process-improvement decisions (where in the SDLC do we leak the most defects?)."
rating: 24
d6: 4
---

# defect-taxonomy-istqb

Catalogs the three load-bearing defect taxonomies:

1. **IEEE 1044-2009** - the formal anomaly-classification
   standard (canonical for regulated / safety-critical
   industries).
2. **ISTQB CTAL-TA root-cause** - the test analyst taxonomy used
   for retrospective root-cause analysis.
3. **Orthogonal Defect Classification (ODC)** - IBM Research's
   eight-attribute framework for in-process defect classification.

Consumers:
[`bug-report-critic`](../../agents/bug-report-critic.md)
(rejects unclassified defects) and
[`bug-report-from-failure`](../bug-report-from-failure/SKILL.md)
(populates classification fields).

## When to use

- Reviewing a defect report's classification fields.
- Establishing the team's classification vocabulary.
- Running a root-cause analysis after a customer escape.
- Producing process-improvement metrics ("60% of escapes are
  requirements defects").

## IEEE 1044-2009 classification

IEEE 1044-2009 "Standard Classification for Software Anomalies"
(cite by stable ID; statutory text behind ieee.org paywall)
defines four classification dimensions per defect:

### 1. Anomaly class

What the anomaly broadly **is**.

| Class | Description |
|---|---|
| Defect | An imperfection in a work product. |
| Test failure | An anomaly observed during testing. |
| Customer failure | An anomaly observed by a customer. |
| Process anomaly | Process not followed correctly. |
| Document anomaly | Documentation defect. |
| Configuration anomaly | Configuration / environment issue. |

### 2. Anomaly type

Where in the lifecycle the defect originated.

| Type | Example |
|---|---|
| Requirements | Missing requirement; ambiguous requirement; conflicting requirements. |
| Design | Architectural flaw; incorrect algorithm choice. |
| Code (implementation) | Off-by-one; null-pointer; incorrect logic. |
| Interface | Wrong API contract; type mismatch between modules. |
| Data | Incorrect test data; production data corruption. |
| Tools | CI tool failure; environment misconfiguration. |
| Test specification | Wrong expected result in the test case. |
| User documentation | Help text describes wrong behaviour. |

### 3. Anomaly severity

Per [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).

### 4. Cause classification

Root cause categories: timing, race condition, memory leak,
boundary condition, calculation error, control flow, etc.

## ISTQB CTAL-TA root-cause taxonomy

The ISTQB Advanced Test Analyst syllabus simplifies to six
high-frequency categories used in retrospective root-cause
analysis:

| Root cause | Definition | Example |
|---|---|---|
| **Requirements** | Missing, wrong, or ambiguous requirement. | "We never specified what happens when the cart is empty at checkout." |
| **Design** | Design choice that produces the defect. | "Architecture coupled UI to DB schema; schema change broke UI." |
| **Implementation** | Correct design, wrong code. | "Off-by-one in pagination logic." |
| **Interface / integration** | Modules disagree on contract. | "Auth service returns `null` for missing claim; UI expects empty string." |
| **Test data / environment** | Test passed against wrong fixture. | "Staging DB had stale schema; test reported false positive." |
| **Build / configuration** | Right code, wrong configuration. | "Feature flag default flipped in prod; test environment was correct." |

Per ISTQB Glossary
([glossary.istqb.org](https://glossary.istqb.org/)) entries
"root cause" and "root cause analysis." The categories above
appear in CTAL-TA syllabus §6 on defect management.

## Orthogonal Defect Classification (ODC)

IBM Research's ODC framework (Chillarege et al. 1992) classifies
each defect on **eight orthogonal attributes** so that the
classification is reproducible across analysts and the resulting
distribution is informative.

### Opener attributes (recorded when defect is found)

| Attribute | Values |
|---|---|
| **Activity** | Where defect was found: Design Review, Code Inspection, Unit Test, Function Test, System Test, Acceptance Test. |
| **Trigger** | What made the defect surface: Design Conformance, Logic / Flow, Backward Compatibility, Concurrency, Boundary, Workload / Stress, Recovery, Test Coverage, Test Variation, Test Sequencing, Test Interaction. |
| **Impact** | How the customer experiences it: Installability, Integrity / Security, Performance, Maintenance, Documentation, Usability, Reliability, Capability, Accessibility, Standards, Migration. |

### Closer attributes (recorded when defect is closed)

| Attribute | Values |
|---|---|
| **Target** | What was modified: Design, Code, Build / Package, Information Development (docs). |
| **Defect Type** | What kind of change: Function / Algorithm, Assignment / Initialization, Interface, Checking, Timing / Serialization, Build / Package / Merge, Documentation. |
| **Qualifier** | Why the defect existed: Missing, Incorrect, Extraneous. |
| **Source** | Where the defective code came from: In-house, Library / Reused, Outsourced, Ported. |
| **Age** | When introduced: New, Old, Rewritten, Refixed. |

ODC's strength: the **distribution** of values per attribute
indicates **where in the process the defect process leaks**. A
high "Function / Algorithm - Missing - Requirements activity"
cluster says the requirements review process is broken.

Per IBM Research's published ODC materials and Chillarege's
canonical paper "Orthogonal Defect Classification - A Concept for
In-Process Measurements" (IEEE Trans. Software Engineering 1992).

## Same defect under three taxonomies - worked example

**Defect:** Checkout silently drops the discount when the user
applies two stackable promo codes in reverse order. Reproducible.

| Taxonomy | Classification |
|---|---|
| **IEEE 1044-2009** | Class: Defect. Type: Code (implementation). Severity: High (S2). Cause: Control flow (incorrect ordering in promo-stacking loop). |
| **ISTQB CTAL-TA** | Implementation (correct design - stackable promos are supported - but the loop control-flow has the order-sensitivity bug). |
| **ODC** | Activity: Function Test. Trigger: Test Sequencing. Impact: Capability (feature doesn't work). Target: Code. Defect Type: Function / Algorithm. Qualifier: Incorrect. Source: In-house. Age: New. |

The three give different lenses: IEEE points at "control flow";
CTAL-TA points at "implementation"; ODC says "the function-test
activity caught what code inspection missed, and the bug is a
sequencing-triggered algorithm issue."

## Process metrics enabled by classification

Once defects are classified, useful metrics emerge:

- **Defect leakage by lifecycle phase**: count defects where
  IEEE Type = "Requirements" found in System Test or later. High
  = upstream review is weak.
- **Defect injection vs detection rate**: ODC "Activity" vs
  "Trigger" cross-tab. Many "Function Test" activities catching
  "Boundary" triggers = unit-test boundary coverage is weak.
- **Root-cause distribution over releases**: CTAL-TA root causes
  per release. Trending up on "Interface" = integration
  contracts need attention.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Free-text "root cause" field | No aggregation possible | Use a controlled vocabulary - pick one of the three taxonomies + populate enums |
| Single-axis classification ("severity only") | Loses root-cause signal entirely | Add at least an IEEE 1044 Type field |
| Classifying after closure only | Detection-time data lost (ODC Opener attributes) | Classify at triage; refine at closure |
| ODC without training | Inter-analyst disagreement explodes; metrics noisy | Calibrate via training set (10 defects classified by 2 analysts; reconcile) |
| Custom taxonomy invented per team | Cross-team metrics impossible | Use IEEE 1044 or ODC as the floor |
| Classifying duplicates separately | Inflates counts; same root cause counted thrice | Resolve duplicates first; classify the canonical |
| Treating "Implementation" as the default | Hides design / requirements leakage | Require explicit classification; default = "unclassified" until reviewer assigns |

## Limitations

- **Classification is human work.** ML classifiers exist but
  require calibrated training data; inter-rater agreement on
  ODC's eight axes is moderate.
- **Taxonomies are anchored in a snapshot of practice.** IEEE
  1044 dates from 2009 (updated periodically); ODC from 1992;
  ISTQB syllabus evolves. The categories are conventional, not
  universal.
- **Costs vs benefits.** Full ODC adds ~5 - 10 minutes per defect
  at closure. Adopt the minimum (IEEE Type + ISTQB root cause)
  unless safety-critical / regulated need full ODC.
- **Doesn't replace 5-whys.** Taxonomies categorise; root-cause
  analysis explains. Use both.

## References

- IEEE 1044-2009 "Standard Classification for Software Anomalies" - cite by stable ID. Primary taxonomy.
- ISTQB Advanced Test Analyst (CTAL-TA) syllabus §6 - root-cause
  taxonomy. Glossary entries at
  [glossary.istqb.org](https://glossary.istqb.org/).
- Orthogonal Defect Classification - Chillarege et al. (1992)
  "Orthogonal Defect Classification - A Concept for In-Process
  Measurements," IEEE Transactions on Software Engineering 18(11).
  Cite by stable DOI when available.
- IBM Research ODC FAQ - chillarege.com/odc resources.
- Sibling references:
  [`bug-lifecycle-reference`](../bug-lifecycle-reference/SKILL.md),
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).
- Consumed by:
  [`bug-report-critic`](../../agents/bug-report-critic.md),
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md).
