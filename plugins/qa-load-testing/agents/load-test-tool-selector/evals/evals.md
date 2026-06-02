---
component: load-test-tool-selector
type: agent
archetype: A2
---

# load-test-tool-selector - evals

## Eval 1: happy path - k6 for a JS team, API RPS soak

**Input:**
- Goal: "200 RPS sustained for 30 minutes against the /orders endpoint."
- Team stack: TypeScript backend (Node.js), CI is GitHub Actions.
- No existing load-test config files.

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **k6** as the primary tool. Rationale: modern Go runtime + JS scripting fits the team stack; built-in `vus` (virtual users), `duration`, `stages` for ramps; Grafana / k6 Cloud integration optional. Read next: `k6-load-testing`.

**Pass condition:** Output contains the literal substrings `k6` AND `k6-load-testing` AND (`RPS` OR `JS` OR `TypeScript`) and does NOT recommend JMeter / Gatling / Locust / Lighthouse as the primary.

## Eval 2: branch - Lighthouse for browser-side Core Web Vitals

**Input:**
- Goal: "Web Vitals (LCP, INP, CLS) regression detection on the marketing site, on every PR."
- Team stack: Web app with Lighthouse CI already integrated (`lighthouserc.json` present).

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **Lighthouse** as the primary tool. Rationale: detected existing `lighthouserc.json` AND goal is browser-side perf (Web Vitals); Lighthouse is the right tool. Read next: `lighthouse-perf`. Suggests `perf-budget-gate` for CI threshold setup.

**Pass condition:** Output contains the literal substrings `Lighthouse` AND `lighthouse-perf` AND (`Web Vitals` OR `LCP` OR `INP`) and does NOT recommend k6 / JMeter / Gatling / Locust as the primary.

## Eval 3: adversarial - "test the system" with no load profile

**Input:**
- Goal: "Load test the platform."
- No RPS target, no soak duration, no ramp profile.
- No existing convention.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to recommend a tool. Explains that load testing without a profile (RPS / soak duration / ramp) is undirected; asks the user to supply a concrete profile (e.g., "200 RPS sustained for 30 minutes" or "ramp from 1 to 500 VU over 10 minutes, hold 20 minutes"). Does NOT default to a tool to make the request actionable.

**Pass condition:** Output contains the literal substrings (`profile` OR `RPS` OR `soak`) AND (`refuse` OR `cannot` OR `need`) and does NOT contain "Recommended tool: k6" OR "Recommended tool: JMeter" OR "Recommended tool: Gatling" OR "Recommended tool: Locust" OR "Recommended tool: Lighthouse".

## Notes

- Eval file lives outside the lint glob - no rating frontmatter needed.
- Pass conditions are literal-string checks.
- Target-model dates are eval-authoring dates (2026-05-25).
