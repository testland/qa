---
component: web-e2e-framework-selector
type: agent
archetype: A2
---

# web-e2e-framework-selector — evals

Companion eval cases for [`web-e2e-framework-selector`](../../web-e2e-framework-selector.md).
Three cases covering happy path (continue with detected Playwright) + branch
(greenfield project recommend Playwright) + adversarial (two competing frameworks
in deps).

## Eval 1: happy path — project already uses Playwright

**Input:**
- `package.json` devDependencies contains `"@playwright/test": "^1.49.0"`.
- An existing `playwright.config.ts` is present at the project root.
- Existing `tests/` directory with `*.spec.ts` files.
- No framework override.
- Goal: "add cross-browser matrix to existing E2E suite."

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Recommends **continue with Playwright** (does NOT propose a swap). Notes Playwright's built-in cross-browser support (Chromium / Firefox / WebKit) and recommends BrowserStack as the cloud cross-browser runner ONLY if matrix beyond Playwright's bundled browsers is needed (e.g., older Safari versions, real iOS Safari).

**Pass condition:** Output contains the literal substrings `Playwright` AND (`continue` OR `existing convention`) and does NOT recommend swapping to Cypress / Selenium / Puppeteer / TestCafe / WebdriverIO.

## Eval 2: branch — greenfield project, no existing framework

**Input:**
- `package.json` contains `"react": "^18"` and `"vite": "^5"` but no E2E framework.
- No existing E2E config files.
- No framework override.
- Goal: "add an E2E suite covering Chromium, Firefox, and WebKit."

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Recommends **Playwright** for greenfield + all-browser-coverage. Rationale: ships with Chromium / Firefox / WebKit, auto-wait, tracing. Read next: `playwright-testing`. Notes Cypress as the secondary fallback if the team prioritizes time-travel debugging over cross-browser breadth.

**Pass condition:** Output contains the literal substring `Playwright` AND (`Chromium` AND `Firefox` AND `WebKit`) AND `playwright-testing` and does NOT recommend Cypress as the primary (Cypress lost WebKit-via-Playwright dependency in 2023 + has weaker Firefox).

## Eval 3: adversarial — two competing frameworks present

**Input:**
- `package.json` devDependencies contains BOTH `"@playwright/test": "^1.49.0"` AND `"cypress": "^13.0.0"`.
- Both `playwright.config.ts` AND `cypress.config.js` exist at the project root.
- Each has tests in its respective directory.

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to silently pick one. Asks which framework is canonical (and offers migration guidance toward the chosen one). Lists the trade-off: keeping both adds maintenance cost; picking one requires migration effort. Does NOT default to either or recommend a third option.

**Pass condition:** Output contains the literal substring `which` OR `canonical` OR `pick one` AND mentions BOTH `Playwright` AND `Cypress` AND does NOT contain "Recommended framework: " followed by a single value with no caveat.

## Notes

- Eval file lives outside the lint glob — no rating frontmatter needed.
- Pass conditions are literal-string checks; a reviewer can grep transcripts.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates.
