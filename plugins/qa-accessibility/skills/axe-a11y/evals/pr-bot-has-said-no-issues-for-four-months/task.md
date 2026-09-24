# The PR bot has posted "no issues found" on 214 pull requests

## Problem Description

`shopfront-web` has a bot that posts an accessibility summary as a comment on
every pull request. Since it was switched on in May it has printed
`Accessibility: no issues found.` on all 214 of them.

Support does not agree with that. Last quarter they logged 31 accessibility
tickets against staging:

- 12 about the sale banner — customers say the text is unreadable against the
  orange artwork behind it.
- 11 about the account menu — the small pin and remove icons beside each entry
  are, in one customer's words, "impossible to hit on a phone without hitting
  the wrong one". Three of those came from the same enterprise account.
- 8 spread across the cart and the order-history table.

The nightly job scans staging and writes its output into `a11y/results/`.
Nobody has read that output by hand since the bot was built, because the bot is
what people actually look at. Whoever built it left a setup note in `docs/`.

The contract we signed with that enterprise account names WCAG 2.2 AA, and
their procurement team has started asking us to evidence it.

I want the comment to stop lying. Then tell me what else is wrong, because 31
tickets did not all come from one bug in a comment formatter.

Three things have been asked for while you are in there. I want a straight
answer on each rather than a diplomatic one, and I am not expecting all three
to get the same answer.

- Priya (front-end lead) wants `color-contrast` switched off. Her argument is
  that the scanner itself says it could not work out what is behind the banner
  text, which is the tool admitting it does not know rather than finding
  anything, and brand signed those colours off in February.
- Dan (my manager) wants every rule the engine has turned on. His argument is
  that we have been silent for four months, he would rather be noisy than
  silent, and he does not want to be sitting here in December because something
  else was quietly switched off.
- Kofi (QA) wants the bot to stop being advisory and actually fail the pull
  request. He is right that nobody acts on a comment.

## Output Specification

1. Fix `lib/comment.js` so the comment reflects what the scan actually found.
   Keep the exported name and signature of `renderComment` as they are.
2. Add cases to `test/comment.test.js` covering the behaviour you changed. The
   existing case must keep passing unmodified.
3. Make whatever change to `a11y/axe.config.json` your findings justify.
4. Kofi's request lands as code, not a promise: add `lib/verdict.js` exporting
   `blockingDecision`, choose its signature yourself, and cover it in
   `test/verdict.test.js`.
5. Write `docs/a11y-scan-review.md`: what the bot has actually been reporting
   since May, a separate answer to each of the three requests above, and what
   you would tell support about the 31 tickets.
6. No new dependencies. `npm test` runs `node --test` and must be green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "shopfront-web",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/comment.js ===============
import { readFileSync } from 'node:fs';

export function renderComment(resultsPath) {
  const results = JSON.parse(readFileSync(resultsPath, 'utf8'));

  if (results.violations.length === 0) {
    return 'Accessibility: no issues found.';
  }

  const lines = results.violations.map(
    (v) => `- ${v.impact}: ${v.id} (${v.nodes.length} nodes)`,
  );
  return ['Accessibility: issues found.', ...lines].join('\n');
}

=============== FILE: test/comment.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderComment } from '../lib/comment.js';

function fixture(results) {
  const dir = mkdtempSync(join(tmpdir(), 'a11y-'));
  const path = join(dir, 'results.json');
  writeFileSync(path, JSON.stringify(results));
  return path;
}

test('names a critical violation in the comment', () => {
  const path = fixture({
    url: 'https://staging.shopfront.example/',
    violations: [
      { id: 'image-alt', impact: 'critical', nodes: [{ target: ['img.hero'] }] },
    ],
    incomplete: [],
    passes: [],
    inapplicable: [],
  });

  assert.match(renderComment(path), /image-alt/);
});

=============== FILE: a11y/axe.config.json ===============
{
  "urls": ["https://staging.shopfront.example/"],
  "outputDir": "a11y/results",
  "runOptions": {
    "runOnly": {
      "type": "tag",
      "values": ["wcag2a", "wcag2aa"]
    }
  }
}

=============== FILE: docs/a11y-bot.md ===============
# The accessibility PR bot

Built 2026-05-06. The nightly job scans staging with axe-core and writes JSON
into `a11y/results/`; the bot reads last night's file and posts a comment on
every open pull request.

Setup notes from the time:

- I ran one unrestricted scan by hand on 2026-05-04 to see what we were in for.
  63 findings on the home page, most of them house-style items nobody was ever
  going to fix. Shipping that as a PR comment would have got the bot muted
  inside a week.
- So the run is pinned to the conformance tags instead of everything the engine
  knows about. `wcag2a` + `wcag2aa` is the AA bar the enterprise contract
  names. Home came back clean on those, which is what we were aiming for.
- Home page only for now. The nightly window is tight and the rest of the
  routes need a logged-in session the job does not have yet. I did click
  through /cart and /orders by hand with the same tags in May and stopped
  writing findings down at 40.

Clean since launch.

=============== FILE: a11y/results/home.json ===============
{
  "url": "https://staging.shopfront.example/",
  "timestamp": "2026-09-12T02:14:07.442Z",
  "testEngine": { "name": "axe-core", "version": "4.10.2" },
  "toolOptions": {
    "reporter": "v1",
    "runOnly": { "type": "tag", "values": ["wcag2a", "wcag2aa"] }
  },
  "violations": [],
  "incomplete": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "tags": ["cat.color", "wcag2aa", "wcag143"],
      "description": "Ensures the contrast between foreground and background colours meets WCAG 2 AA thresholds",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
      "nodes": [
        {
          "target": ["p.banner-copy"],
          "html": "<p class=\"banner-copy\">Up to 40% off, this weekend only</p>",
          "failureSummary": "Element background colour could not be determined due to a background image"
        },
        {
          "target": ["a.banner-cta"],
          "html": "<a class=\"banner-cta\" href=\"/sale\">See the sale</a>",
          "failureSummary": "Element background colour could not be determined due to a background image"
        },
        {
          "target": ["span.sale-badge"],
          "html": "<span class=\"sale-badge\">Sale</span>",
          "failureSummary": "Element background colour could not be determined due to a background gradient"
        }
      ]
    }
  ],
  "passes": [
    { "id": "image-alt", "tags": ["cat.text-alternatives", "wcag2a", "wcag111"], "nodes": [{ "target": ["img.hero"] }, { "target": ["img.logo"] }] },
    { "id": "label", "tags": ["cat.forms", "wcag2a", "wcag412", "wcag131"], "nodes": [{ "target": ["#search-q"] }] },
    { "id": "button-name", "tags": ["cat.name-role-value", "wcag2a", "wcag412"], "nodes": [{ "target": ["button.search-go"] }, { "target": ["button.account-toggle"] }, { "target": ["button.pin"] }, { "target": ["button.remove"] }] },
    { "id": "link-name", "tags": ["cat.name-role-value", "wcag2a", "wcag244", "wcag412"], "nodes": [{ "target": ["a.brand"] }, { "target": ["a.help"] }] },
    { "id": "aria-hidden-focus", "tags": ["cat.name-role-value", "wcag2a", "wcag412"], "nodes": [{ "target": ["#account-menu"] }] },
    { "id": "html-has-lang", "tags": ["cat.language", "wcag2a", "wcag311"], "nodes": [{ "target": ["html"] }] },
    { "id": "document-title", "tags": ["cat.text-alternatives", "wcag2a", "wcag242"], "nodes": [{ "target": ["html"] }] }
  ],
  "inapplicable": [
    { "id": "video-caption", "tags": ["cat.time-and-media", "wcag2a", "wcag122"], "nodes": [] },
    { "id": "frame-title", "tags": ["cat.text-alternatives", "wcag2a", "wcag412"], "nodes": [] },
    { "id": "th-has-data-cells", "tags": ["cat.tables", "wcag2a", "wcag131"], "nodes": [] },
    { "id": "area-alt", "tags": ["cat.text-alternatives", "wcag2a", "wcag111"], "nodes": [] }
  ]
}

=============== FILE: src/routes.js ===============
export const routes = [
  { path: '/', name: 'home', auth: false },
  { path: '/search', name: 'search', auth: false },
  { path: '/product/:sku', name: 'product', auth: false },
  { path: '/cart', name: 'cart', auth: false },
  { path: '/checkout', name: 'checkout', auth: true },
  { path: '/orders', name: 'order-history', auth: true },
];

=============== FILE: src/components/account-menu.jsx ===============
const ICON_BUTTON = {
  width: 20,
  height: 20,
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'none',
};

export function AccountMenu({ open, items, onPin, onRemove }) {
  return (
    <div id="account-menu" hidden={!open}>
      <button type="button" className="account-toggle">Account</button>
      <ul className="items">
        {items.map((it) => (
          <li key={it.href} className="row">
            <a href={it.href}>{it.label}</a>
            <button
              type="button"
              className="pin"
              style={ICON_BUTTON}
              aria-label={`Pin ${it.label}`}
              onClick={() => onPin(it)}
            >
              <svg width="20" height="20" aria-hidden="true" focusable="false" />
            </button>
            <button
              type="button"
              className="remove"
              style={ICON_BUTTON}
              aria-label={`Remove ${it.label}`}
              onClick={() => onRemove(it)}
            >
              <svg width="20" height="20" aria-hidden="true" focusable="false" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
