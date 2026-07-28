# Seven-axis procurement scoring rubric

Deep reference for the `qa-vendor-evaluator` SKILL.md, Step 2. The per-sub-axis scoring rubric for each of the seven procurement axes. Score each vendor on each axis, with every score citing its source.

## Axis A1 - Capability fit

How well does the vendor's feature set match the team's documented NFR priorities?

| Sub-axis | Scoring rubric (per-vendor) |
|---|---|
| Core feature coverage | % of team's required features present (cite the team's requirement list) |
| Advanced / aspirational features | Features the team doesn't need today but might in 2 years |
| Documented limits | Per-account / per-test / per-user caps that may bind |

## Axis A2 - Cost model

How is the vendor priced and what does it cost at the team's scale?

| Sub-axis | Scoring rubric |
|---|---|
| Pricing model | Per-seat / per-test / per-execution / flat licence / hybrid |
| Cost at current team size | Year-1 cost, cited to vendor pricing page (vendor-data) |
| Cost at projected team size | Year-2 and year-3 projections; the team's growth plan drives this |
| Hidden costs | Add-ons (parallel execution, premium support, SSO, audit log, on-prem option) |
| Volume-discount commitments | Annual commits, multi-year discounts (cite to vendor sales channel) |

## Axis A3 - Integration depth with existing stack

Per the [Capgemini WQR 2025-26](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/) finding (37% blocked by integration friction), this axis is often under-weighted in procurement. The skill weights it explicitly.

| Sub-axis | Scoring rubric |
|---|---|
| CI integration | Native plugin? REST API? Webhook? CLI? Cite the integration doc URL per vendor |
| Tracker integration | Jira / Linear / GitHub Issues / Azure DevOps |
| Observability integration | Datadog / Grafana / New Relic / Sentry |
| Test-framework binding | Playwright / Cypress / Selenium / per-language |
| SSO / IAM | SAML / OIDC / SCIM provisioning |
| Reverse data flow | Can the team export raw test results? In what format? |

For each integration, score: native (1.0) / API-buildable (0.7) / community-plugin (0.5) / not available (0.0). Use the team's existing integration skills (`testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration`) as the per-vendor baseline.

## Axis A4 - Vendor lock-in risk

The cost of being unable to leave.

| Sub-axis | Scoring rubric |
|---|---|
| Proprietary data formats | Are tests in a portable format (Gherkin / standard JSON / open spec) or vendor-proprietary DSL? |
| Test artifact portability | Can the team export tests, results, history? In what format? Vendor-published export tools count toward portability. |
| Data residency | Where is data stored? Can the team request export and deletion? |
| Migration path | Are there documented or community-tested migration paths off this vendor (mabl -> Playwright, Testim -> Cypress)? |

## Axis A5 - Exit cost

The team has decided to leave in 24 months - what does it cost?

| Sub-axis | Scoring rubric |
|---|---|
| Test re-authoring effort | If tests are vendor-DSL-bound, the migration is "rewrite from scratch." If tests are portable (Gherkin, standard fixtures), migration is mostly mechanical. |
| History portability | Can the team take its test-result history? Defect-history correlation depends on this. |
| Re-training | How long to retrain the team on the new vendor? |
| Data egress fees | Some vendors charge for bulk data export. Cite the contract clause if applicable. |
| Contract early-termination cost | Multi-year commits often have early-termination fees. |

## Axis A6 - Contractual posture

Procurement / legal / security review needs structured data.

| Sub-axis | Scoring rubric |
|---|---|
| SLA tier | Uptime guarantee, support response time, escalation paths |
| Support tier | Email-only / chat / phone / dedicated CSM |
| Security audit availability | SOC 2 Type II report? ISO 27001? Penetration-test results? |
| On-prem / private-cloud option | For regulated industries; cite the vendor's deployment options page |
| Data-processing agreement | GDPR-compliant DPA available? HIPAA BAA? |
| Sub-processor disclosure | Vendor's sub-processor list (the regulated-industry view) |

## Axis A7 - Customer-reference data

Independent (not vendor-published) signal.

| Sub-axis | Scoring rubric |
|---|---|
| Gartner Peer Insights | Rating, review density, recency. Cite the category report URL. |
| G2 / Capterra | Rating, review density. Flag if reviews are sparse or stale (<10 reviews in last 12 months). |
| Practitioner blog / conference signal | Has the vendor been written about by recognised practitioners (Lisa Crispin, James Whittaker, etc.)? Cite the source. |
| Reddit / r/QualityAssurance / Hacker News | Anecdotal community signal - tag as such. Don't weight equally with surveyed data. |
