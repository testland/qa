# Heuristic test-design models

Deep reference for the `test-case-from-live-feature` SKILL.md. The catalog of the four canonical heuristic test-design models the Step 2 walk consumes - Bach's Heuristic Test Strategy Model (HTSM) with SFDPOT product elements, Whittaker's 'How to Break Software' attack patterns, Bolton's FEW HICCUPPS consistency oracles, and the ISO/IEC 25010 quality characteristics - for the zero-documentation case: no user story, no acceptance criteria, no documentation.

The exploratory-testing literature converged on these four models, each cited
inline at point of use below. This is a **pure reference** - no execution
steps; the SKILL.md spine turns the walk into a case matrix.

## How to use the catalog

Run the four models in sequence; each one narrows the next. No written story
or acceptance criteria are required - that is the whole point.

1. **Enumerate coverage targets** - walk SFDPOT (Model 1) across the feature to list every structure, function, data element, platform, operation, and time dimension worth probing.
2. **Attack each target** - apply Whittaker's attack patterns (Model 2) to each SFDPOT item to turn "what to cover" into concrete "how it can break".
3. **Classify surprises** - when a behaviour looks wrong and no spec says so, name the FEW HICCUPPS consistency lens (Model 3) it violates, so the finding is a defensible bug report.
4. **Cross-check quality dimensions** - pass the feature through the ISO/IEC 25010 characteristics (Model 4) to catch performance, security, usability, or reliability gaps a functional walk misses.

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

Apply them in the "How to use" order above: SFDPOT enumerates targets, Whittaker attacks each one, FEW HICCUPPS classifies the surprises, and 25010 confirms no quality dimension was skipped.

## Worked example - "test the new checkout flow, no spec"

The four models applied end to end to a zero-documentation brief.
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

The output is the input to the SKILL.md spine, which turns the SFDPOT +
Whittaker walk into a structured test-case matrix.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using SFDPOT as a checklist to tick rather than a prompt to think | Box-ticking; the model produces lazy coverage. | Each guideword should generate observations and follow-up questions, not a `done` mark. |
| Citing FEW HICCUPPS without naming which lens fired | The bug report reads "this feels wrong" - undefensible. | Always name the lens: "violates Comparable-products consistency: every other site disables this button while the request is in flight." |
| Treating Whittaker attacks as exhaustive | The attack list is illustrative, not complete; new attack classes emerge with new tech (LLM prompt injection, supply-chain). | Apply the categories as prompts, then keep going. |
| Using ISO 25010 as the only model | Quality-attribute thinking without product-element thinking misses where the bugs live. | Always pair 25010 with SFDPOT. |
| Heuristic test design without a spec when the team has a spec | The spec is the better input; heuristics are the fallback. | Use `test-case-ideation-from-story` first; reach for this catalog when no spec exists. |
| Halting because "we have no docs" | The whole point of these models is that you don't need docs to start. | Apply the models; flag the documentation gap separately as a process issue. |

## Limitations

- **Coverage breadth, not depth.** The four models surface *what to look at*; they don't tell you how deep to go on each. Risk-based prioritisation (per `risk-matrix`) is the depth selector.
- **Domain knowledge is still required.** Applying SFDPOT to "checkout" without knowing what checkout is produces shallow output. The models are scaffolding for domain reasoning, not a replacement for it.
- **Citation-grade only where canonical.** HTSM is Bach; FEW HICCUPPS is Bolton; ISO 25010 is the standard; Whittaker is the book. Other heuristic frameworks exist (Crispin/Gregory's testing quadrants, Heusser's "test ideas") and are also valid - this catalog names the four most-cited; the team can extend.
- **Not a substitute for product / requirements work.** Heuristic test design surfaces the coverage gap; the documentation gap is a separate problem the team should escalate.

## References

Each model's primary source is cited inline at its section: HTSM / SFDPOT (satisfice.com), FEW HICCUPPS (developsense.com), ISO/IEC 25010 (Wikipedia), and Whittaker's attack patterns (via the exploratory-testing article). Additional references, not repeated inline:

- James Bach blog - heuristics category (SFDPOT, CRUSSPIC STMPL, consistency heuristics): https://www.satisfice.com/blog/archives/category/heuristics
- ISTQB glossary - exploratory testing: https://glossary.istqb.org/en_US/term/exploratory-testing
- ISTQB glossary - heuristic evaluation: https://glossary.istqb.org/en_US/term/heuristic-evaluation
