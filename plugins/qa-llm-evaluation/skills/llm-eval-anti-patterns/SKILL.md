---
name: llm-eval-anti-patterns
description: "Audits an existing LLM evaluation suite for eight methodology errors that make its numbers untrustworthy: too few cases per capability, single-provider lock-in, exact-match assertions on open-ended output, no semantic-similarity check on paraphrase-tolerant output, no baseline comparison in CI, no cost or latency ceiling, unpinned model identifiers, and no adversarial coverage. Supplies harness-neutral detection cues, the reason each error invalidates the result, a concrete fix, a Critical/Warning/Info severity scheme, and a findings-table output shape. Covers validating an LLM judge against human labels before its verdicts count as evidence. Use when an eval suite already exists and its pass rate is about to gate a release, a model swap, or a prompt change, and nobody has audited how the suite itself was built."
---

# llm-eval-anti-patterns

An LLM eval suite can be green and still be worthless. The failure is not in
the system under test, it is in the eval definition: too few cases to
distinguish signal from sampling noise, assertions that cannot fail for the
right reason, no baseline to compare against, or a judge model whose verdicts
have never been checked against a human.

This catalog reviews the **eval definition**, not the eval run. Read the
config, the test data, the assertions, and the CI job that executes them.
Every finding must point at a line in one of those.

## What this owns, and what it does not

| This catalog | Not this catalog |
|---|---|
| Reviews a suite that already exists | Building the suite, choosing a harness, or writing the first test cases |
| Judges whether the suite's design can produce a trustworthy verdict | Choosing which quality metrics matter for the product |
| Reports methodology defects with a severity and a fix | Ranking one model against another, or running the benchmark |

If there is no eval suite yet, there is nothing here to review. If the
question is "which model is better", that is a benchmarking exercise, and this
catalog only tells you whether the benchmark you are about to trust was
constructed soundly.

## Severity scheme

Three levels. These are a review convention, not a standard:

| Severity | Means |
|---|---|
| **Critical** | Silent regression risk, or eval theater: the suite passes for a reason unrelated to the behavior it claims to measure. |
| **Warning** | A real defect surface the suite cannot see. Address before the next release. |
| **Info** | Coverage worth adding. Not blocking. |

The Critical bar is deliberately narrow. Reserve it for the two cases where a
green run actively misleads: an assertion that cannot detect the failure it
was written for (anti-pattern 3), and a run with nothing to compare against
(anti-pattern 5).

## Reading an eval definition in any harness

The eight checks below are about structure, not syntax. In whatever harness
the suite uses, locate these five things first:

1. **The case set.** The rows, records, or fixtures the suite iterates over.
2. **The system under test.** Which model or models each case is run against.
3. **The assertions or scorers.** What decides pass and fail per case.
4. **The judge configuration.** If any assertion is model-graded, which model
   grades it, and with what instructions.
5. **The gate.** The CI step that turns per-case results into a merge decision.

The five slots are always present; the per-harness vocabulary for Promptfoo,
LangSmith, Braintrust, DeepEval, and OpenAI Evals is mapped in
[references/harness-mapping.md](references/harness-mapping.md). Where a check
below names an exact key, that key is verified in that harness's linked docs;
everywhere else the description is deliberately structural so it transfers.

---

## 1. Too few cases per evaluated capability

**Detect.** Count cases per capability, not per file. A suite with 200 rows
that covers eleven behaviors may have fewer than a dozen rows behind each
claim. Look for a capability tag, a filename convention, or a grouping key;
if none exists, that absence is itself the finding, because nobody can tell
what the pass rate is a pass rate *of*. Fewer than about 10 cases per
evaluated capability is the flag. **That number is a practitioner
convention, not a statistical threshold** - use it as a prompt to compute the
real uncertainty, not as a target.

**Why it invalidates.** An eval is an experiment whose cases are a sample, so
the score carries sampling error (Miller 2024). With a handful of cases the
confidence interval swallows the difference the suite is meant to detect, so a
pass rate moving from 90% to 80% is indistinguishable from noise. A single run
of a stochastic model is one draw; if the harness can repeat the case set,
repeat it and report a central estimate with an interval, not a bare number.

**Related risk when adding coverage.** Growing a case set by importing a public
benchmark risks test-set contamination - the eval data may already sit in the
model's pretraining corpus, and the effect separates into memorization and
exploitation (Magar and Schwartz 2022). Prefer cases written against your own
product surface, or drawn from production traffic.

**Fix.** Tag every case with the capability it exercises. Grow thin
capabilities with new cases sourced from your own traffic. Never delete cases
to raise a pass rate.

## 2. Single provider or single model in the definition

**Detect.** Read the system-under-test slot. One entry means every result is
conditional on that one model. In Promptfoo, `providers:` accepts a list, and
running against several produces a comparison matrix over the same cases (per
[promptfoo.dev/docs/configuration/guide](https://promptfoo.dev/docs/configuration/guide/)):

```yaml
providers:
  - openai:gpt-5-mini
  - vertex:gemini-2.0-flash-exp
```

**Why it invalidates.** A single-model run cannot separate "the prompt is good"
from "this model happens to tolerate this prompt", so it cannot answer the
question most often asked of the suite: whether a model swap is safe. This is a
practitioner observation about eval design, not a research finding - a
**Warning**, not a block.

**Fix.** Add at least one second model from a different family and let the
same cases run against both. Where a second model is genuinely out of scope
(the product is contractually bound to one), say so in the suite's own
documentation so the next reader does not mistake a scoping decision for an
oversight.

## 3. Exact-match assertions on open-ended output

**Detect.** For each case, ask whether more than one correct answer exists. If
it does, and the only assertions are equality or substring containment, that
is the finding. In Promptfoo the deterministic family includes `equals`,
`contains`, `icontains`, `regex`, `starts-with`, `contains-any`,
`contains-all`, and the structural `is-json` / `contains-json` checks, while
the model-graded family includes `llm-rubric`, `g-eval`, `factuality`, and
`model-graded-closedqa` (per
[promptfoo.dev/docs/configuration/expected-outputs](https://promptfoo.dev/docs/configuration/expected-outputs/)).
A summarization, rewriting, or explanation case whose assertion list contains
only names from the first family is the pattern.

**Why it invalidates.** An `equals` assertion on generated prose passes only on
a byte-identical fixture and fails on trivial wording changes, so it measures
string identity, not the quality claim written next to it. This is the
eval-theater case, and why it is **Critical**: the suite guards a property
nobody cares about while appearing to guard the one they do.

**Fix.** Replace the exact-match assertion with a rubric-graded one that
states the actual acceptance criterion, plus a similarity check for
paraphrase tolerance (anti-pattern 4). Keep the deterministic assertion only
where the output really is closed-form: a JSON shape, an enum label, a
required identifier appearing in the text. Then read the next section,
because a rubric-graded assertion introduces a second model whose own
reliability is now load-bearing.

## 4. No semantic-similarity check on paraphrase-tolerant output

**Detect.** Look for cases whose reference answer is one valid phrasing among
many, and whose assertion list has no similarity or embedding-based check.
Promptfoo exposes this as the `similar` assertion, configured with a
`threshold` on cosine similarity of embeddings (per
[promptfoo.dev/docs/configuration/expected-outputs](https://promptfoo.dev/docs/configuration/expected-outputs/)).
DeepEval covers the equivalent ground through a `GEval` metric whose
`criteria` describes the semantic property and whose `threshold` sets the
passing score (default 0.5), with `evaluation_params` naming the test-case
fields to score (per
[deepeval.com/docs/metrics-llm-evals](https://deepeval.com/docs/metrics-llm-evals)).
Other harnesses expose a comparable scorer under a different name; look for
any scorer whose output is a continuous score against a reference rather than
a boolean.

**Why it invalidates.** Without it, open-ended output has only two modes:
brittle exact match, or a rubric judge with no anchor to a reference answer.
Similarity fills the middle, catching drift a rubric grader rates as
"acceptable" in isolation. Missing it is a **Warning** - the suite still
measures something, it just cannot see gradual regression.

**Fix.** Add a similarity assertion against the reference answer for every
paraphrase-tolerant case, and set the threshold from measured data rather
than a default. Run the current known-good outputs through it, look at the
distribution, and place the threshold below the worst acceptable output and
above the best unacceptable one. A threshold copied from a tutorial is a
threshold nobody has validated.

## The judge is a model under test

Anti-patterns 3 and 4 both push work onto a grading model. That model is not
an oracle. It is a second system under test, and until it has been validated
against human labels its verdicts are not evidence.

**Known, documented failure modes.** LLM judges show position, verbosity, and
self-enhancement bias plus limited reasoning (Zheng 2023); self-preference is
real and correlates linearly with a model's ability to recognize its own text
(Panickssery 2024). So grading a model's output with the same model or a
same-family sibling points a bias directly at the number reported.

**Validation is the entry fee, not a nice-to-have.** LLM-generated evaluators
need human validation before their scores mean anything, and *criteria drift*
means the grading criteria you actually want often depend on the outputs
already seen (Shankar 2024). A strong judge, once measured, can reach over 80%
agreement with human preferences - about the human-human rate (Zheng 2023) -
but that agreement rate is one you measure for *your* rubric and outputs, not
one you can assume.

**What to check in the eval definition.**

- Is the judge model named explicitly, or inherited from a default? An
  unnamed judge is an unpinned dependency (anti-pattern 7 applies to it too).
- Is the judge a different model from the system under test? If it is the
  same model or the same family, flag self-preference explicitly.
- Is there a labeled set, however small, where human verdicts and judge
  verdicts are compared, with the agreement rate recorded somewhere a
  reviewer can find?
- For pairwise or preference-style grading, is candidate order randomized or
  swapped across runs, so position bias averages out rather than accumulating?

Where the harness supports overriding the grader, use it rather than relying
on a default. In Promptfoo the grading provider can be set at three levels:
`promptfoo eval --grader <provider>` on the command line, `defaultTest.options.provider`
for a whole suite, or a `provider` key on an individual assertion, with the
assertion-level setting taking precedence (per
[promptfoo.dev/docs/configuration/expected-outputs/model-graded](https://promptfoo.dev/docs/configuration/expected-outputs/model-graded/)).
In DeepEval the judge is the `model` argument on the metric, which accepts a
model identifier or a custom implementation (per
[deepeval.com/docs/metrics-llm-evals](https://deepeval.com/docs/metrics-llm-evals)).

## 5. No baseline comparison in CI

**Detect.** Read the CI job. Does it run the suite and assert an absolute
threshold, or does it compare this run against a recorded prior run? An
absolute threshold with no stored comparison point is the finding. Two
harness examples of what the compared form looks like: the Promptfoo GitHub
Action runs on every pull request that modifies a prompt and produces a
before-versus-after comparison, posting a link to explore the difference
interactively (per
[promptfoo.dev/docs/integrations/github-action](https://promptfoo.dev/docs/integrations/github-action/));
Braintrust records each run as an immutable, comparable experiment
specifically so CI can catch regressions before they reach production (per
[braintrust.dev/docs/guides/evals](https://www.braintrust.dev/docs/guides/evals)).

**Why it invalidates.** This is the second **Critical**. Absolute thresholds
drift down quietly: a suite gated at "85% must pass" reports success at 85.1%
whether the previous run was 85.2% or 97%, so every regression above the floor
is invisible, and the floor itself gets lowered whenever it starts failing.
Without a stored baseline there is no artifact recording what the suite used to
do, so nobody can prove a regression happened.

**Why the comparison itself needs care.** Comparing two runs is a statistical
comparison of two samples, not a subtraction; the paired structure of running
both variants on the same questions measures the difference far more precisely
(Miller 2024). A gate that fires on any drop fires constantly on a stochastic
system; one that fires only on drops beyond the noise band is worth having.

**Fix.** Store the baseline run as an artifact keyed to the default branch.
Have CI run the same case set against both the baseline and the candidate,
diff per case, and fail on regressions outside the measured noise band. Keep
the absolute threshold too if you like, but it is a floor, not a gate.

## 6. No cost or latency ceiling

**Detect.** Look for any assertion or budget expressed in currency or
milliseconds. Promptfoo exposes both directly as assertion types: `cost` with
a `threshold` in dollars per response, and `latency` with a `threshold` in
milliseconds (per
[promptfoo.dev/docs/configuration/expected-outputs](https://promptfoo.dev/docs/configuration/expected-outputs/)):

```yaml
assert:
  - type: latency
    threshold: 200
  - type: cost
    threshold: 0.001
```

Harnesses without a native assertion still record per-run token usage and
duration; if neither is checked anywhere, that is the finding.

**Why it invalidates.** Cost and latency are quality attributes of the system,
not overhead of the eval. A prompt change that doubles token spend while
holding accuracy flat is a regression the suite silently approves. Secondary
concern: a model-graded assertion invokes a judge per case, so an unbounded
suite grows until someone notices the invoice.

**Fix.** Add a per-case latency ceiling and a per-case cost ceiling derived
from the product's actual budget, not from a round number. Add a per-run
total-cost cap in CI so a malformed case set cannot run unbounded.

## 7. Model identifiers not pinned

**Detect.** Read every model identifier in the suite, including the judge's.
The question is not "does it have a date in it" but "does this string resolve
to the same weights next month". Provider conventions differ and must be read
from that provider's own versioning documentation. Anthropic's model overview
states that every Claude model ID is a pinned snapshot, that IDs containing a
date are fixed to that release, that from the Claude 4.6 generation onward
the dateless IDs are also pinned snapshots rather than evergreen pointers,
and that for earlier generations the alias column entries are convenience
pointers resolving to a dated ID (per
[platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview)).
So a bare identifier is not automatically unpinned, and a dated one is not
automatically the only safe form. Check the provider's documentation and
record what you found.

**Why it invalidates.** If an identifier resolves to a moving target, every
historical result was produced by an unknown system, the anti-pattern 5
baseline is not reproducible, and an overnight regression cannot be attributed
to the code change under review. It is a **Warning** rather than a Critical
because the suite still measures something real on the day it runs.

**Fix.** Use the pinned form the provider documents, for the system under
test and for the judge. Record the resolved identifier in the run artifact so
a future reader can tell what actually executed. Treat a deliberate model
upgrade as its own change, evaluated against the stored baseline, rather than
letting it arrive silently.

## 8. No adversarial coverage

**Detect.** Look for cases whose expected outcome is a refusal, a safe
fallback, or a sanitized response, as opposed to a correct answer. If every
case is a well-formed request, the suite tests only the happy path. Two
concrete shapes of the missing coverage: Promptfoo's red-team feature
generates adversarial inputs and evaluates the responses, organized into
plugins covering harmful content, broken object-level and function-level
authorization, prompt injection and jailbreaking, PII and training-data
leakage, and unwanted content generation (per
[promptfoo.dev/docs/red-team](https://www.promptfoo.dev/docs/red-team/));
Giskard's `giskard.scan(model)` performs an automatic vulnerability
assessment covering hallucination and misinformation, harmful content
generation, prompt injection, robustness, output formatting, information
disclosure, and stereotypes and discrimination, and can convert its findings
into a reusable test suite (per
[legacy-docs.giskard.ai open-source LLM scan](https://legacy-docs.giskard.ai/en/stable/open_source/scan/scan_llm/index.html)).

**Why it invalidates.** It does not invalidate the functional result, which is
why this is **Info**. It bounds what the suite can claim: a green run means the
system behaves on inputs someone thought to write down. Automated adversarial
generation works - LM-generated test cases against a 280B-parameter chatbot
uncovered tens of thousands of offensive replies plus PII and training-data
leakage (Perez 2022) - but that same work is explicit it is one tool among
several, so treat adversarial coverage as raising the floor, not closing the
question.

**Fix.** Add a red-team case set alongside the functional one, kept separate
so a safety failure is legible as a safety failure. Promote every production
incident into it as a permanent regression case.

---

## Worked example

A suite with one config file and one CI job.

`promptfooconfig.yaml`:

```yaml
providers:
  - openai:gpt-4
prompts:
  - "Summarize the following support ticket: {{ticket}}"
tests:
  - vars:
      ticket: "Customer cannot log in after password reset."
    assert:
      - type: equals
        value: "The customer is unable to log in following a password reset."
  - vars:
      ticket: "Billing charged twice for the March invoice."
    assert:
      - type: contains
        value: "billing"
```

`.github/workflows/eval.yml` runs `npx promptfoo eval` and fails the job if
any case fails. There is no stored baseline, no cost or latency assertion, and
no red-team case set.

Findings:

```
| # | Severity | File:Line | Anti-pattern | Recommendation |
|---|---|---|---|---|
| 1 | Critical | promptfooconfig.yaml:8 | Exact-match `equals` on a summary, which has many correct phrasings | Replace with `llm-rubric` stating the acceptance criterion ("faithful one-sentence summary, no invented facts") plus `similar` against the reference, threshold set from measured known-good outputs |
| 2 | Critical | .github/workflows/eval.yml:12 | Absolute pass/fail with no comparison against a recorded prior run | Store a default-branch baseline artifact; run both case sets and fail on per-case regressions outside the measured noise band |
| 3 | Warning | promptfooconfig.yaml:2 | Two capabilities (summarization, classification) with one case each | Tag cases by capability and grow each to a size whose confidence interval is narrower than the difference the gate must detect |
| 4 | Warning | promptfooconfig.yaml:2 | Single provider, so results cannot separate prompt quality from model tolerance | Add a second provider from a different family and run the same cases against both |
| 5 | Warning | promptfooconfig.yaml:2 | Model identifier not confirmed against the provider's versioning docs | Look up the provider's pinning convention, use the pinned form, and record the resolved identifier in the run artifact |
| 6 | Warning | promptfooconfig.yaml (absent) | No `cost` or `latency` assertion, so a spend or speed regression passes silently | Add per-case `cost` and `latency` thresholds derived from the product budget, plus a per-run total-cost cap in CI |
| 7 | Warning | promptfooconfig.yaml (absent) | No judge configured yet; once finding 1 lands, `llm-rubric` introduces an unvalidated grader | Name the judge explicitly, use a model from a different family than the system under test, and record judge-versus-human agreement on a small labeled set |
| 8 | Info | repository (absent) | No adversarial or refusal cases | Add a separate red-team case set; promote every production incident into it |

## Verdict

- Critical findings: 2 - must address before this suite gates anything
- Warning findings: 5 - address this sprint
- Info findings: 1 - backlog

Recommended next action: fix finding 1 first. Until the summarization
assertion can fail for the right reason, the pass rate is measuring string
identity, and the baseline added in finding 2 would just freeze that.
```

## Output format

One markdown table, one row per finding, ordered Critical then Warning then
Info:

```
| # | Severity | File:Line | Anti-pattern | Recommendation |
```

Then a verdict block with the count at each severity and a single-sentence
next action. Rules that keep the report usable:

- Every row cites a file and line, or names the file and marks the finding
  absent. A finding with no location is not reviewable.
- The recommendation is the specific change to make, not the category of
  change. "Add `llm-rubric` with criterion X plus `similar` at threshold Y"
  is a recommendation; "improve assertions" is not.
- Adding coverage is the fix for anti-patterns 1 through 4. Deleting cases to
  raise a pass rate is not a fix and does not belong in a recommendation.
- A suite with an outstanding Critical finding is not passing, whatever its
  reported pass rate says.

## Limitations

- This catalog reviews configuration. It cannot tell you whether the case set
  covers the behaviors your users care about; that requires knowing the
  product.
- Detection is structural, so a bespoke in-house harness needs the five slots
  in "Reading an eval definition" mapped by hand before the checks apply.
- The `< 10 cases per capability` figure and the three-level severity scheme
  are review conventions, not standards. The statistical work of deciding how
  many cases you actually need belongs to the uncertainty analysis in
  Miller 2024.
- Judge-versus-human agreement rates are specific to a rubric, an output
  distribution, and a judge model. A rate published in a paper is evidence
  that measuring it is worthwhile, not a substitute for measuring yours.

## References

- Full academic citations for every parenthetical author-year token above
  (Miller 2024, Magar and Schwartz 2022, Zheng 2023, Panickssery 2024,
  Shankar 2024, Perez 2022): [references/citations.md](references/citations.md).
- Per-harness slot mapping (Promptfoo, LangSmith, Braintrust, DeepEval, OpenAI
  Evals): [references/harness-mapping.md](references/harness-mapping.md).
