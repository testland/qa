# What to automate and what to keep human

Deep reference for `manual-testing-overview` SKILL.md. The body carries the
condensed decision rule; this file holds the full per-row table with
citations. All page and section numbers refer to
[ISTQB CTFL Syllabus v4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf).

| Work | Where it belongs | Why |
|---|---|---|
| Regression suites re-run every release | Automated | "Regression test suites are run many times and generally the number of regression test cases will increase with each iteration or release, so regression testing is a strong candidate for automation" (CTFL v4.0.1, p.30) |
| Component and component-integration checks | Automated, in CI | Quadrant Q1 tests "should be automated and included in the CI process" (§5.1.7, p.51) |
| Smoke tests and non-functional tests other than usability | Automated | Quadrant Q4, "often automated" (p.51) |
| Exploratory testing, usability testing, user acceptance testing | Human | Quadrant Q3 tests are "user-oriented and often manual" (p.51) |
| Usability judgement | Human, and often in a dedicated environment | Non-functional testing "sometimes needs a very specific test environment, such as a usability lab for usability testing" (§2.2.2, p.29) |
| Visual and aesthetic judgement ("does this read as broken?") | Human decides; a tool may flag | A pixel-diff tool detects that something changed; whether the change is acceptable is a judgement call. Practitioner convention, not a standard: automate the detection, keep the verdict human |
| One-off verification of a one-line fix you will never run again | Human | Writing and maintaining a script costs more than the check saves. ISTQB lists "using a test tool when manual testing is more appropriate" as a named risk of test automation (§6.2, p.60) |

Two failure modes sit at the ends of this table. Keeping a deterministic
regression pass manual means paying for it again every release, with human
attention that degrades on the fortieth repetition. Automating everything
hits the other named automation risk: "relying on a tool too much, e.g.,
ignoring the need of human critical thinking" (§6.2, p.60).
