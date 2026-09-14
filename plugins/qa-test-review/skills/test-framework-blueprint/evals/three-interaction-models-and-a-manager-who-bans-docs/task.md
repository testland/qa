# Three ways of driving the UI in one suite, one quarter to fix it

## Problem Description

Ardent Health, appointment scheduling. The suite is two years old, 210
browser specs, and nobody designed it - it accreted.

There are three ways of driving the UI in there right now and all three are
live. `tests/pages/` has 22 screen objects from the original author.
`tests/tasks/` and `tests/actors/` are a partly-built layer a contractor
added in the spring, used by 18 specs and then abandoned when his contract
ended. And about thirty specs skip both and poke the Redux store directly
through a debug hook the app exposes in non-production builds.

`tests/schedule.spec.ts` uses all three inside one file, which is how I
noticed. Engineers tell me they pick whichever style the nearest file used.

Our quarterly architecture audit came back in July and I have attached the
summary. I have been asked to fix this and I have one quarter to do it.

Where my head is at: the screen objects are the incumbent - 161 specs, two
years of work, everyone knows them. The contractor's tasks-and-actors thing
was half-built when he left and nobody has touched it since, and the store
hook was always a shortcut. So the cheap move is to delete `tests/tasks/`
and `tests/actors/`, rewrite the 18 specs that use them against the screen
objects, and get everything onto one model that way. Eighteen specs is a
week. Tell me if you would do it differently, but that is my starting point.

One constraint from Jen, my manager, that I need you to work inside. She does
not want a standing conventions document - something in the repo that has to
be kept current. Her words: "the code is the doc - nobody reads the wiki,
just tell us which folder to delete and make the code clean." She has been
burned by documents that went stale and then got quoted back at her, and she
is not being unreasonable about it. A one-off write-up of the decision for
her and the team lead is fine; a page somebody has to maintain is not.

Attached: the suite inventory, the July audit, the config, and the files that
show the mix.

## Output Specification

1. Write `docs/re-architecture.md` - the decision and the reasoning behind
   it.
2. Write `docs/migration-order.md` - what moves in what order, and what has
   to be true before each step starts.
3. Create whatever else you judge the team needs in order to hold this over
   the next quarter. Name each file you create and state why it exists. If
   you judge that nothing else is needed, say so explicitly and why.
4. Do not modify any file under `tests/`, `src/` or `test/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ardent-scheduling",
  "version": "4.11.3",
  "private": true,
  "scripts": {
    "test:unit": "node --test \"test/**/*.test.js\"",
    "test:e2e": "playwright test --project=regression",
    "test:smoke": "playwright test --project=smoke"
  },
  "devDependencies": {
    "@playwright/test": "1.55.0"
  }
}

=============== FILE: playwright.config.ts ===============
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'regression' },
    { name: 'smoke', grep: /@smoke/ },
  ],
});

=============== FILE: reports/suite-inventory.md ===============
# Suite inventory - 2026-09-05

|                                                       | Count |
|-------------------------------------------------------|-------|
| Browser specs (`tests/**/*.spec.ts`)                   | 210   |
| Unit tests (`test/**`, node --test)                    | 96    |
| Screen objects (`tests/pages/`)                        | 22    |
| Tasks (`tests/tasks/`)                                 | 6     |
| Actors (`tests/actors/`)                               | 3     |
| Specs using `tasks/` + `actors/`                       | 18    |
| Specs calling `window.__ardent.store.dispatch` direct  | 31    |
| Specs using `pages/` only                              | 161   |
| Specs mixing more than one of the three                | 7     |

Eight of the 22 screen objects are per-role variants of three screens -
`SchedulePage` / `SchedulePageClinician` / `SchedulePageBilling`,
`MessagesPage` / `MessagesPagePatient` / `MessagesPageScheduler`,
`DocumentsPage` / `DocumentsPageScheduler`. Each variant was added when that
role got its own specs. They differ only in which controls they expose and
which of them are read-only.

Runner: Playwright Test, TypeScript. There is no other runner in the repo for
the browser tier.

Roles the suite drives. All four do the same scheduling, messaging and
document-upload work, differing in what they are permitted to do with it:

- patient (self-service booking)
- scheduler (front desk, books on behalf of patients)
- clinician (views and reschedules their own calendar)
- billing admin (reads appointments, cannot book)

Growth: 210 specs today, 128 of them added in the last twelve months. The
2027 roadmap adds two more service lines; the planning estimate we submitted
was 380-420 specs by the end of 2027.

Release process: `npm run test:smoke` runs against the built production
artifact before every release (RELEASE.md step 4). Everything else runs
against a development build.

Team: 5 engineers write these tests, all TypeScript.

=============== FILE: reports/architecture-audit-2026-Q2.md ===============
# Framework architecture audit - Ardent scheduling suite - 2026-07-14

Cross-file findings only. Per-file review is the pull-request check's job and
is not repeated here.

1. Three interaction models coexist: `pages/`, `tasks/` + `actors/`, and
   direct store dispatch. Seven specs use more than one. Interviewed
   engineers report choosing by "whichever the nearest file used". No
   convention exists to point them at.

2. Documented-versus-actual drift: section skipped. There is no written
   convention anywhere in the repository to compare the code against. Same
   outcome in 2026-Q1 and in 2025-Q4.

3. `tests/pages/SchedulePage.ts` carries assertions. Screen objects returning
   verdicts rather than state is a per-pattern issue, noted here only because
   it is repeated across 9 of the 22 objects.

4. The debug hook `window.__ardent.store` is registered by the app only when
   the bundle is built with `NODE_ENV !== 'production'`. 31 specs call it.
   Two of those 31 carry the `@smoke` tag.

5. Unit tier (`test/`, 96 tests, owned by the service teams) is out of scope
   for this suite and was not reviewed. No findings.

=============== FILE: tests/schedule.spec.ts ===============
import { test, expect } from '@playwright/test';
import { SchedulePage } from './pages/SchedulePage';
import { BookAppointment } from './tasks/BookAppointment';
import { scheduler } from './actors/scheduler';

test('front desk books a follow-up into the next open slot', async ({ page }) => {
  const schedulePage = new SchedulePage(page);
  await schedulePage.goto('2026-10-01');
  await scheduler(page).attemptsTo(BookAppointment.forPatient('P-4417').at('10:20'));
  await expect(page.getByTestId('slot-10-20')).toHaveText('Booked');
});

test('reschedule moves the appointment and frees the old slot @smoke', async ({ page }) => {
  await page.goto('/schedule/2026-10-01');
  await page.evaluate(() =>
    window.__ardent.store.dispatch({
      type: 'appointments/seed',
      payload: [{ id: 'A-91', patientId: 'P-4417', at: '10:20' }],
    }),
  );
  const schedulePage = new SchedulePage(page);
  await schedulePage.dragAppointment('A-91', '11:00');
  await schedulePage.expectSlotBooked('11:00');
});

=============== FILE: tests/pages/SchedulePage.ts ===============
import { expect, type Page } from '@playwright/test';

export class SchedulePage {
  constructor(private readonly page: Page) {}

  async goto(day: string) {
    await this.page.goto(`/schedule/${day}`);
  }

  async dragAppointment(id: string, toTime: string) {
    const target = this.page.getByTestId(`slot-${toTime.replace(':', '-')}`);
    await this.page.getByTestId(`appt-${id}`).dragTo(target);
  }

  async expectSlotBooked(time: string) {
    await expect(this.page.getByTestId(`slot-${time.replace(':', '-')}`)).toHaveText('Booked');
  }
}

=============== FILE: tests/tasks/BookAppointment.ts ===============
import type { Page } from '@playwright/test';

export class BookAppointment {
  private constructor(
    private readonly patientId: string,
    private readonly time: string,
  ) {}

  static forPatient(patientId: string) {
    return { at: (time: string) => new BookAppointment(patientId, time) };
  }

  async performAs(page: Page) {
    await page.getByTestId('new-appointment').click();
    await page.getByLabel('Patient').fill(this.patientId);
    await page.getByLabel('Time').selectOption(this.time);
    await page.getByRole('button', { name: 'Book' }).click();
  }
}

=============== FILE: tests/actors/scheduler.ts ===============
import type { Page } from '@playwright/test';

interface Performable {
  performAs(page: Page): Promise<void>;
}

export function scheduler(page: Page) {
  return {
    async attemptsTo(...tasks: Performable[]) {
      for (const task of tasks) await task.performAs(page);
    },
  };
}

=============== FILE: src/slots.js ===============
'use strict';

function openSlots(dayStartMin, dayEndMin, stepMin, bookedMinutes) {
  const taken = new Set(bookedMinutes);
  const out = [];
  for (let m = dayStartMin; m + stepMin <= dayEndMin; m += stepMin) {
    if (!taken.has(m)) out.push(m);
  }
  return out;
}

module.exports = { openSlots };

=============== FILE: test/slots.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openSlots } = require('../src/slots');

test('skips a booked slot and stops before the end of the day', () => {
  assert.deepEqual(openSlots(540, 600, 20, [560]), [540, 580]);
});

test('returns nothing when every slot is booked', () => {
  assert.deepEqual(openSlots(540, 600, 20, [540, 560, 580]), []);
});
