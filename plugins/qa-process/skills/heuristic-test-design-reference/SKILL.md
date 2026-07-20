---
name: heuristic-test-design-reference
description: "Reference catalog of the four canonical heuristic test-design models - Bach's Heuristic Test Strategy Model (HTSM) with SFDPOT product elements, Whittaker's 'How to Break Software' attack patterns, Bolton's FEW HICCUPPS consistency oracles, and the ISO/IEC 25010 quality characteristics - for use when the tester has no user story, no acceptance criteria, and no documentation. This is the zero-documentation case: it does not read from a written story, and it yields test-case ideas rather than session charters. Use as the reference layer when generating coverage for a feature with no documented input."
---

# heuristic-test-design-reference

## Overview

The exploratory-testing literature converged on four canonical heuristic test-design models, each cited inline at point of use below. This skill is a **pure reference** - no execution steps; it is the catalog `test-case-from-live-feature` and exploratory-charter authoring consume to generate coverage when no documented input exists.

## When to use

- A feature is being tested with no story, no AC, no documentation (the dominant real-world starting point for [exploratory testing](https://en.wikipedia.org/wiki/Exploratory_testing), an approach "concisely described as simultaneous learning, test design and test execution"; Cem Kaner coined the term in 1984).
- A legacy / brownfield codebase has no test coverage and you are onboarding cold.
- A competitor or reverse-engineered product is under review (security audit, market intel).
- A spec exists but is so thin that heuristic supplementation is needed alongside it.
- A team's exploratory charter needs a structured prompt set instead of pure intuition.

Do **not** use this skill alone to produce a deliverable. It is the **input** to a downstream authoring skill (`test-case-from-live-feature`, `manual-test-script-author`). The catalog tells you *what to look at*; the downstream skill turns observations into a matrix or charter.

## Model 1 - HTSM / SFDPOT product elements (Bach)

[James Bach's Heuristic Test Strategy Model](https://www.satisfice.com/download/heuristic-test-strategy-model) (HTSM v6.3) is the canonical "guideword heuristics" framework. The mnemonic **SFDPOT** covers the **Product Elements** dimension - the parts of the system that need coverage. The four HTSM focus areas are: Test Techniques, Project Elements, Product Factors, and Quality Criteria categories.

| Guideword | What to probe |
|---|---|
| **S - Structure** | Code, files, modules, services, infrastructure layers, dependencies. What does the product *consist of*? |
| **F - Function** | Each feature / capability the product offers. What does it *do*? (UI, API, scheduled jobs, side-effects.) |
| **D - Data** | Inputs, outputs, persistent stores, types, sizes, encodings, lifecycles, ownership. What does it *operate on*? |
| **P - Platform** | OS, browsers, devices, runtimes, third-party libs, network conditions. What does it *run on*? |
| **O - Operations** | How it's deployed, configured, monitored, upgraded, backed up, recovered. How is it *used / operated*? |
| **T - Time** | Speed, sequencing, concurrency, time-of-day effects, scheduling, race conditions, expirations. How does it behave *over time*? |

Each guideword expands the search space. SFDPOT applied to "checkout flow" generates: Structure (cart service, payment service, inventory service), Function (add to cart, apply coupon, choose shipping, pay, confirm), Data (cart items, coupon codes, addresses, payment tokens, order IDs), Platform (desktop / mobile, iOS / Android, Stripe / Adyen integrations), Operations (deploy, rollback, monitoring, alerting), Time (cart expiry, coupon expiry, payment timeout, idempotency keys).

Coverage check: a feature passed through SFDPOT that has zero notes under one guideword is a flag - either the guideword is genuinely n/a (rare) or the team has a coverage gap.

## Model 2 - Whittaker "How to Break Software" attack patterns

James Whittaker's [*How to Break Software*](https://en.wikipedia.org/wiki/Exploratory_testing) (cited in the exploratory-testing literature as the canonical attack-pattern catalog) organises adversarial test ideas as **attacks** - explicit ways the software can fail. The canonical attack categories:

| Attack | What you do | Typical bug surface |
|---|---|---|
| **Input attack** | Feed inputs outside the documented domain - too long, wrong encoding, malformed format, empty, null, special chars, SQL-keyword strings | Validation gaps, injection, crashes |
| **Output attack** | Force outputs the system shouldn't produce - overflow buffers, wrong encoding, locale boundary | Display bugs, serialisation gaps |
| **Stored-data attack** | Manipulate the persistent store directly (DB row, file, cache) and then exercise the feature | State-handling bugs, cache inconsistency |
| **Computation attack** | Force the system to compute on the boundary (overflow, underflow, divide by zero, max-int, NaN) | Arithmetic / type / overflow bugs |
| **User-interface attack** | Click out-of-order, double-click, navigate away mid-action, browser-back, refresh during submit | State-machine bugs, race conditions |
| **Configuration attack** | Run with non-default config, missing env vars, mis-set flags, third-party API key revoked | Configuration brittleness, fail-open bugs |

Apply Whittaker after SFDPOT: SFDPOT enumerates what to cover; Whittaker enumerates how each thing can break.

## Model 3 - FEW HICCUPPS consistency oracles (Bolton)

Michael Bolton's [FEW HICCUPPS](https://developsense.com/) is the canonical **oracle** heuristic - how do you decide a behavior is wrong when no spec says so? Each letter is a consistency lens:

| Letter | Consistency with… | What you compare |
|---|---|---|
| **F** | **F**amiliarity | …problems we've seen before in this product or others - does this behave like a known bug? |
| **E** | **E**xplainability | …a reasonable explanation a user could accept - does the behaviour make sense to articulate? |
| **W** | **W**orld | …how the world works (physics, math, calendars, currencies) - does it match reality? |
| **H** | **H**istory | …the product's prior behaviour - did this used to work differently? |
| **I** | **I**mage | …the company / product's image - would a customer find this off-brand? |
| **C** | **C**omparable products | …how competitors / siblings handle it - is the deviation deliberate? |
| **C** | **C**laims | …what the docs / marketing / sales material promised |
| **U** | **U**ser expectations | …what users would reasonably expect from naming, layout, prior workflows |
| **P** | **P**roduct (itself) | …other parts of the same product - is the behaviour consistent across pages / endpoints / flows? |
| **P** | **P**urpose | …the feature's stated purpose / intent |
| **S** | **S**tatutes / standards | …laws (GDPR, HIPAA, PCI-DSS, ADA), standards (W3C, RFCs, ISO), regulations |

A finding that violates at least one consistency lens is a defensible bug report even without a spec. The lens is the oracle.

## Model 4 - ISO/IEC 25010 quality characteristics

The canonical quality-attribute taxonomy from [ISO/IEC 25010](https://en.wikipedia.org/wiki/ISO/IEC_25010) (the system / software product quality model, successor to ISO 9126). The eight characteristics define *what kinds of quality* a feature can have - beyond "does it work":

| Characteristic | What to probe |
|---|---|
| **Functional suitability** | Does it do what it's supposed to? Completeness, correctness, appropriateness. |
| **Performance efficiency** | Time behaviour, resource utilization, capacity. |
| **Compatibility** | Co-existence, interoperability with other products / services. |
| **Usability** | Appropriateness recognisability, learnability, operability, error protection, UI aesthetics, accessibility. |
| **Reliability** | Maturity, availability, fault tolerance, recoverability. |
| **Security** | Confidentiality, integrity, non-repudiation, accountability, authenticity. |
| **Maintainability** | Modularity, reusability, analysability, modifiability, testability. |
| **Portability** | Adaptability, installability, replaceability. |

The 2023 revision adds **Safety** and **Interaction Capability** as additional top-level characteristics (cite by stable ID - ISO/IEC 25010:2023; the canonical ISO page sits behind a Cloudflare challenge). Apply 25010 alongside SFDPOT: SFDPOT enumerates *what to cover*; 25010 enumerates *which kinds of quality to test for*. A feature can be functionally correct but fail on performance, security, or usability - and 25010 is the prompt that reminds the tester to check.

## How to combine the models

The four models are orthogonal:

| Model | Answers the question… |
|---|---|
| HTSM / SFDPOT | What parts of the system do I need to look at? |
| Whittaker attacks | How can each part fail? |
| FEW HICCUPPS | When I see weird behaviour, is it a bug? |
| ISO 25010 | What kinds of quality am I testing for? |

Workflow: walk SFDPOT to enumerate coverage targets → apply Whittaker attacks to each target → as you find unexpected behaviour, classify with FEW HICCUPPS to write a defensible report → cross-reference 25010 to confirm you didn't miss a quality dimension.

## Worked example - "test the new checkout flow, no spec"

Input: "We're shipping a new checkout next week. Test it." That's it.

**SFDPOT walk:**
- **S - Structure**: cart service, payment service, inventory service, idempotency layer. (5 minutes investigating staging deploys.)
- **F - Function**: add to cart, edit qty, apply coupon, choose shipping, choose payment method, place order, see confirmation, receive email.
- **D - Data**: SKU, qty, price, coupon code, address (with locale variants), card / wallet / bank transfer, order id.
- **P - Platform**: desktop Chrome / Safari / Firefox, mobile iOS / Android web, in-app webview (if any), screen reader.
- **O - Operations**: deploy / rollback, alerts on payment-service errors, support's ability to see a stuck order.
- **T - Time**: cart expiry (15 min default?), coupon expiry, payment-provider timeout (30s typical), idempotency-key TTL.

**Whittaker attacks** applied to each function:
- Input attack on coupon: empty, expired, wrong-case, leading whitespace, SQL injection, 256-char string, emoji.
- Stored-data attack on cart: manually set cart.qty to 99999 in DB, then proceed.
- UI attack: double-click "place order"; back-button after charge; refresh during payment redirect.
- Computation attack on price: cart total at the platform's max-amount boundary; currency conversion edge case.
- Configuration attack: payment provider's test key vs prod key; coupon-service unreachable.

**Quality cross-check** (ISO 25010):
- Performance: place-order latency under load; payment-provider timeout handling.
- Security: PCI-DSS scope; address / card data leakage in logs.
- Usability: error-message clarity; keyboard-only flow; screen-reader announcements.
- Reliability: idempotency under network retry; recovery after payment-provider 5xx.

**Oracle (FEW HICCUPPS) for ambiguous findings**:
- Cart shows $99.99 - order says $100.00. Statutes/standards: PCI / accounting (deviation between displayed and charged amount). Bug.
- Place-order button stays clickable while request is in flight. Comparable products: every other site disables. Product purpose: prevents double-charge. Bug.
- Coupon `SUMMER2026` works but `summer2026` doesn't. User expectations: case-insensitive coupons are the norm. Probably bug - file with the FEW HICCUPPS evidence and let product decide.

The output is the input to [`test-case-from-live-feature`](../test-case-from-live-feature/SKILL.md) which turns the SFDPOT + Whittaker walk into a structured test-case matrix.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using SFDPOT as a checklist to tick rather than a prompt to think | Box-ticking; the model produces lazy coverage. | Each guideword should generate observations and follow-up questions, not a `done` mark. |
| Citing FEW HICCUPPS without naming which lens fired | The bug report reads "this feels wrong" - undefensible. | Always name the lens: "violates Comparable-products consistency: every other site disables this button while the request is in flight." |
| Treating Whittaker attacks as exhaustive | The attack list is illustrative, not complete; new attack classes emerge with new tech (LLM prompt injection, supply-chain). | Apply the categories as prompts, then keep going. |
| Using ISO 25010 as the only model | Quality-attribute thinking without product-element thinking misses where the bugs live. | Always pair 25010 with SFDPOT. |
| Heuristic test design without a spec when the team has a spec | The spec is the better input; heuristics are the fallback. | Use `test-case-ideation-from-story` first; reach for this skill when no spec exists. |
| Halting because "we have no docs" | The whole point of these models is that you don't need docs to start. | Apply the models; flag the documentation gap separately as a process issue. |

## Limitations

- **Coverage breadth, not depth.** The four models surface *what to look at*; they don't tell you how deep to go on each. Risk-based prioritisation (per [`risk-matrix`](../risk-matrix/SKILL.md)) is the depth selector.
- **Domain knowledge is still required.** Applying SFDPOT to "checkout" without knowing what checkout is produces shallow output. The models are scaffolding for domain reasoning, not a replacement for it.
- **Citation-grade only where canonical.** HTSM is Bach; FEW HICCUPPS is Bolton; ISO 25010 is the standard; Whittaker is the book. Other heuristic frameworks exist (Crispin/Gregory's testing quadrants, Heusser's "test ideas") and are also valid - this skill names the four most-cited; the team can extend.
- **No automation.** This skill produces prompts; the downstream skills (`test-case-from-live-feature`, `manual-test-script-author`) turn prompts into deliverables.
- **Not a substitute for product / requirements work.** Heuristic test design surfaces the coverage gap; the documentation gap is a separate problem the team should escalate.

## Hand-off targets

- **Turn the heuristic walk into a test-case matrix** → [`test-case-from-live-feature`](../test-case-from-live-feature/SKILL.md).
- **Turn the heuristic walk into a manual execution script** → `manual-test-script-author` (in the qa-manual-testing plugin).
- **When a written spec exists, prefer the spec-driven path** → [`test-case-ideation-from-story`](../test-case-ideation-from-story/SKILL.md).
- **Risk-based prioritisation of which guidewords matter most** → [`risk-matrix`](../risk-matrix/SKILL.md).
- **Domain-specific test-data generation for the attack patterns** → `negative-test-generator`, `malicious-payload-bank`, `boundary-value-generator`.

## References

- James Bach - Heuristic Test Strategy Model v6.3 (HTSM): https://www.satisfice.com/download/heuristic-test-strategy-model
- James Bach blog - heuristics category (SFDPOT, CRUSSPIC STMPL, consistency heuristics): https://www.satisfice.com/blog/archives/category/heuristics
- Michael Bolton - DevelopSense (FEW HICCUPPS oracle heuristic, exploratory testing methodology): https://developsense.com/
- ISO/IEC 25010 - system / software product quality model (eight characteristics; 2023 revision adds Safety + Interaction Capability): https://en.wikipedia.org/wiki/ISO/IEC_25010
- Exploratory testing - "concisely described as simultaneous learning, test design and test execution", term coined by Kaner in 1984; Whittaker "How to Break Software" attack patterns; session-based test management: https://en.wikipedia.org/wiki/Exploratory_testing
- ISTQB glossary - exploratory testing: https://glossary.istqb.org/en_US/term/exploratory-testing
- ISTQB glossary - heuristic evaluation: https://glossary.istqb.org/en_US/term/heuristic-evaluation
- [`test-case-from-live-feature`](../test-case-from-live-feature/SKILL.md) - downstream skill that consumes this catalog.
