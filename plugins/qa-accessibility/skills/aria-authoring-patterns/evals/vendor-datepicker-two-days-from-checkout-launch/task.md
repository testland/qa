# Licensed date-range picker goes into checkout Thursday - need a call on it

## Problem Description

We licensed the date-range picker from Kestrel UI last month and it is
scheduled to replace our own on the checkout page this Thursday. Their README
says WCAG 2.2 AA and "fully keyboard accessible". Our accessibility contractor
finished her engagement in August and nobody has looked at it since.

I need a go / no-go from you today, with the blocking items listed precisely
enough that Kestrel's engineers can act on them. Their support answers
everything by quoting their own test suite back at us — it ships in the package
and it is green — so tell me whether it proves what they will say it proves.

Dan on QA did a keyboard pass on Wednesday and his notes are attached. He is
not an accessibility specialist and says so himself, so treat his notes as
observations rather than as findings — I want your call on each of them, not a
copy of his list. If parts of the component are fine, say so; that is the part
I can show Kestrel when they push back on the parts that are not.

One thing already in flight: when I raised Dan's third point with Kestrel
pre-sales they wrote back saying to pass `assertive` in their options so the
selection summary is announced with priority. I have not done it. Tell me
whether to.

What you have is the markup their widget renders into the page, the two source
files they ship unminified, and the test file that came with the package. The
calendar renders one table row per week.

## Output Specification

Write `reports/daterange-aria-review.md` containing:

1. A go / no-go for Thursday, in the first two lines.
2. The blocking findings. For each: the element, what breaks and for whom, and
   the change Kestrel has to make.
3. A verdict on each of Dan's three observations — blocking, not blocking, or
   already correct — with the reason.
4. A line on Kestrel's `assertive` suggestion.
5. Anything you checked that is correct and should be left alone, so we are not
   arguing about it on Thursday.

Do not edit the vendor files — we cannot patch their bundle.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-daterange-review",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: vendor/daterange/README.md ===============
# @kestrel-ui/daterange 4.2.0

A two-month date range picker.

- WCAG 2.2 AA conformant.
- Fully keyboard accessible.
- No dependencies, 11kB gzipped.

## Notes for integrators

- The widget renders into whatever container you hand it; the markup it
  produces is in `markup.html` in this folder for reference. One table row per
  week, seven cells per row, weeks run Monday to Sunday.
- `keys.js` and `status.js` ship unminified so integrators can rebind shortcuts
  and localise the selection summary.

=============== FILE: reports/qa-keyboard-pass.md ===============
# Keyboard pass on the Kestrel picker, 2026-09-09, @dan

Not my area, so take these as observations. Chrome + NVDA, then Safari +
VoiceOver.

1. **You can only Tab onto one date.** I opened October and pressed Tab
   repeatedly. Focus lands on the 12th and the next press leaves the calendar
   entirely. Thirty other dates in that month and Tab reaches exactly one of
   them.
2. **Dates you cannot book still take focus.** The 16th is sold out and greyed
   out, and I can still land on it. Feels like it should be skipped over the
   way a disabled button is.
3. **The first time I pick a range, nothing is read out.** I select the 12th
   and the 15th and the screen reader says nothing. If I then change the range
   to the 13th and the 15th it does announce it. Only the first one is silent,
   every time, in both browsers.

=============== FILE: vendor/daterange/markup.html ===============
<div class="kst-daterange" id="kst-root">
  <div class="kst-fields">
    <label for="kst-start">Check in</label>
    <input id="kst-start" type="text" readonly value="12 Oct 2026" />
    <label for="kst-end">Check out</label>
    <input id="kst-end" type="text" readonly value="15 Oct 2026" />
  </div>

  <div class="kst-header">
    <button class="kst-nav" id="kst-prev" type="button" aria-label="Previous month">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 2 4 8l6 6" /></svg>
    </button>
    <h2 id="kst-month">October 2026</h2>
    <button class="kst-nav" id="kst-next" type="button" aria-label="Next month">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 2l6 6-6 6" /></svg>
    </button>
  </div>

  <table class="kst-grid" role="presentation">
    <tr>
      <td><div class="kst-day" id="kst-cell-12" role="gridcell" tabindex="0" aria-selected="true">12</div></td>
      <td><div class="kst-day kst-in-range" id="kst-cell-13" role="gridcell" tabindex="-1" aria-selected="true">13</div></td>
      <td><div class="kst-day kst-in-range" id="kst-cell-14" role="gridcell" tabindex="-1" aria-selected="true">14</div></td>
      <td><div class="kst-day" id="kst-cell-15" role="gridcell" tabindex="-1" aria-selected="true">15</div></td>
      <td><div class="kst-day kst-sold-out" id="kst-cell-16" role="gridcell" tabindex="-1" aria-disabled="true" aria-selected="false">16</div></td>
      <td><div class="kst-day" id="kst-cell-17" role="gridcell" tabindex="-1" aria-selected="false">17</div></td>
      <td><div class="kst-day" id="kst-cell-18" role="gridcell" tabindex="-1" aria-selected="false">18</div></td>
    </tr>
    <tr>
      <td><div class="kst-day" id="kst-cell-19" role="gridcell" tabindex="-1" aria-selected="false">19</div></td>
      <td><div class="kst-day" id="kst-cell-20" role="gridcell" tabindex="-1" aria-selected="false">20</div></td>
      <td><div class="kst-day" id="kst-cell-21" role="gridcell" tabindex="-1" aria-selected="false">21</div></td>
      <td><div class="kst-day" id="kst-cell-22" role="gridcell" tabindex="-1" aria-selected="false">22</div></td>
      <td><div class="kst-day" id="kst-cell-23" role="gridcell" tabindex="-1" aria-selected="false">23</div></td>
      <td><div class="kst-day" id="kst-cell-24" role="gridcell" tabindex="-1" aria-selected="false">24</div></td>
      <td><div class="kst-day" id="kst-cell-25" role="gridcell" tabindex="-1" aria-selected="false">25</div></td>
    </tr>
  </table>

  <p class="kst-status" aria-live="polite" hidden></p>

  <div class="kst-footer">
    <button id="kst-flex" type="button" aria-pressed="false">Flexible dates</button>
    <a href="/help/how-dates-work" class="kst-help">How our dates work</a>
    <button id="kst-cancel" type="button">Cancel</button>
    <button id="kst-apply" type="button" class="kst-primary">Apply</button>
  </div>
</div>

=============== FILE: vendor/daterange/keys.js ===============
const CELL = 'kst-cell-';
const dayOf = (id) => Number(id.slice(CELL.length));

export function handleKey(key, targetId) {
  if (key === 'Escape') return { action: 'close' };
  if (!targetId.startsWith(CELL)) return null;
  const day = dayOf(targetId);
  if (key === 'Enter' || key === ' ') return { action: 'select', day };
  if (key === 'ArrowRight') return { action: 'move', focus: CELL + (day + 1) };
  if (key === 'ArrowLeft') return { action: 'move', focus: CELL + (day - 1) };
  if (key === 'ArrowDown') return { action: 'move', focus: CELL + (day + 7) };
  if (key === 'ArrowUp') return { action: 'move', focus: CELL + (day - 7) };
  if (key === 'Home') return { action: 'move', focus: CELL + (day - ((day - 1) % 7)) };
  if (key === 'End') return { action: 'move', focus: CELL + (day + (6 - ((day - 1) % 7))) };
  return null;
}

export function tabIndexFor(cellDay, focusedDay) {
  return cellDay === focusedDay ? '0' : '-1';
}

=============== FILE: vendor/daterange/status.js ===============
export function statusFor(nights) {
  if (!nights) return { hidden: true, text: '' };
  return { hidden: false, text: nights + (nights === 1 ? ' night selected' : ' nights selected') };
}

=============== FILE: test/keys.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleKey, tabIndexFor } from '../vendor/daterange/keys.js';
import { statusFor } from '../vendor/daterange/status.js';

test('arrow keys move the focused day around the month', () => {
  assert.deepEqual(handleKey('ArrowRight', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-13' });
  assert.deepEqual(handleKey('ArrowLeft', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-11' });
  assert.deepEqual(handleKey('ArrowDown', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-19' });
  assert.deepEqual(handleKey('ArrowUp', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-5' });
});

test('Home and End jump to the ends of the week', () => {
  assert.deepEqual(handleKey('Home', 'kst-cell-16'), { action: 'move', focus: 'kst-cell-15' });
  assert.deepEqual(handleKey('End', 'kst-cell-16'), { action: 'move', focus: 'kst-cell-21' });
});

test('Enter and Space pick the focused day', () => {
  assert.deepEqual(handleKey('Enter', 'kst-cell-14'), { action: 'select', day: 14 });
  assert.deepEqual(handleKey(' ', 'kst-cell-14'), { action: 'select', day: 14 });
});

test('Escape closes the picker from anywhere', () => {
  assert.deepEqual(handleKey('Escape', 'kst-cell-14'), { action: 'close' });
  assert.deepEqual(handleKey('Escape', 'kst-apply'), { action: 'close' });
});

test('focus bookkeeping matches the rendered markup', () => {
  assert.equal(tabIndexFor(12, 12), '0');
  assert.equal(tabIndexFor(13, 12), '-1');
  assert.equal(tabIndexFor(16, 12), '-1');
});

test('the selection summary appears once there is a selection', () => {
  assert.deepEqual(statusFor(0), { hidden: true, text: '' });
  assert.deepEqual(statusFor(1), { hidden: false, text: '1 night selected' });
  assert.deepEqual(statusFor(3), { hidden: false, text: '3 nights selected' });
});
