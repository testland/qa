# Five changes came out of the design review and I need an answer on each by Friday

## Problem Description

Nadia ran the design review on the Project settings page on 2026-09-08 and filed
five changes. Sprint closes Friday, the visual design is signed off, and the CSS
for all of it is already merged behind a feature flag. Her list, verbatim from
the ticket:

1. "The billing country dropdown is the only control on the page that still
   looks like 1998. Build it as our own dropdown so the chevron, the hover
   state and the 8px radius match everything else. It is a plain list of 190
   countries, one choice."
2. "The Actions dropdown is broken for screen reader users. It reads out
   'Actions, button' and then, when you open it, just a list of links — no
   signal at all that it is a menu. Give the list a menu role and make each row
   a menu item so it announces as the menu it is."
3. "The assignees picker is unusable. It is a `select multiple` and people
   cannot tell who is already loaded up. Each row needs the avatar, the name,
   and how many open tasks that person has, and you pick several. Build it
   properly."
4. "Save changes is greyed out until the form validates and nobody can work out
   why. Put our tooltip component on it with the reason. Keep it greyed out —
   the greying is the whole point."
5. "Tab order on the form is wrong — it goes name, country, description,
   visibility and we want name, description, country, visibility. Just number
   the fields 1 to 4."

Give me a decision per item with the reasoning, and build the ones that should
be built. Nadia will push back on anything that does not ship, so the reasoning
has to be something I can say out loud in the review and have it stand up.

`npm test` is green right now. Keep it green.

## Output Specification

1. Edit `src/project-settings.html` only where your decision says something
   should change there. Leave the rest byte-identical.
2. Implement whatever you decided to build in `src/assignees.js`, and extend
   `test/assignees.test.js` so the new behaviour is covered. The suite must pass
   with `npm test` when you are done.
3. Write `docs/design-review-response.md`: one section per numbered item, saying
   what ships, what does not, and why — in terms Nadia can take back to design.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "project-settings",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/project-settings.html ===============
<form id="project-settings" class="settings">
  <label for="name">Project name</label>
  <input id="name" name="name" />

  <label for="country">Billing country</label>
  <select id="country" name="country">
    <option value="AF">Afghanistan</option>
    <option value="AL">Albania</option>
    <!-- 187 more options rendered from src/countries.json -->
    <option value="ZW">Zimbabwe</option>
  </select>

  <label for="description">Description</label>
  <textarea id="description" name="description"></textarea>

  <fieldset>
    <legend>Visibility</legend>
    <label><input type="radio" name="visibility" value="private" checked /> Private</label>
    <label><input type="radio" name="visibility" value="org" /> Anyone in the org</label>
  </fieldset>

  <label class="check">
    <input type="checkbox" id="deploy-emails" name="deploy-emails" checked />
    Email me when a deploy finishes
  </label>

  <p id="assignees-label">Assignees</p>
  <div id="assignees-root" data-component="assignees"></div>

  <div class="actions-wrap">
    <button type="button" id="actions" class="btn">Actions</button>
    <ul id="actions-menu" class="dropdown" hidden>
      <li><a href="/projects/42/duplicate">Duplicate project</a></li>
      <li><a href="/projects/42/settings/advanced">Advanced settings</a></li>
      <li><a href="/projects/42/transfer">Transfer to another org</a></li>
    </ul>
  </div>

  <button type="submit" id="save" class="btn btn-primary" disabled>Save changes</button>
  <p id="save-hint" class="hint" hidden>Add a project name before you can save</p>
</form>

=============== FILE: src/assignees.js ===============
const byName = (a, b) => a.name.localeCompare(b.name);

export function createAssignees(people) {
  return { people: [...people].sort(byName), selected: new Set(), activeIndex: 0 };
}

export function keyDown(state, key) {
  if (key === 'ArrowDown') {
    return { ...state, activeIndex: Math.min(state.activeIndex + 1, state.people.length - 1) };
  }
  if (key === 'ArrowUp') {
    return { ...state, activeIndex: Math.max(state.activeIndex - 1, 0) };
  }
  return state;
}

export function toggleActive(state) {
  const id = state.people[state.activeIndex].id;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return { ...state, selected };
}

export function renderAssignees(state) {
  return {
    container: { id: 'assignees', class: 'assignee-list' },
    rows: state.people.map((person, i) => ({
      id: 'assignee-' + person.id,
      class: i === state.activeIndex ? 'row is-active' : 'row',
      'data-selected': state.selected.has(person.id) ? 'true' : 'false',
      avatar: person.avatar,
      text: person.name + ' - ' + person.openTasks + ' open tasks',
    })),
  };
}

=============== FILE: test/assignees.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssignees, keyDown, toggleActive, renderAssignees } from '../src/assignees.js';

const PEOPLE = [
  { id: 'rmatthews', name: 'Rae Matthews', avatar: '/a/rae.png', openTasks: 3 },
  { id: 'kdavies', name: 'Kit Davies', avatar: '/a/kit.png', openTasks: 11 },
  { id: 'nsoto', name: 'Nadia Soto', avatar: '/a/nadia.png', openTasks: 0 },
];

test('people are listed alphabetically', () => {
  const state = createAssignees(PEOPLE);
  assert.deepEqual(state.people.map((p) => p.name), ['Kit Davies', 'Nadia Soto', 'Rae Matthews']);
});

test('arrow keys move the active row and stop at the ends', () => {
  let state = createAssignees(PEOPLE);
  assert.equal(state.activeIndex, 0);
  state = keyDown(state, 'ArrowUp');
  assert.equal(state.activeIndex, 0);
  state = keyDown(keyDown(keyDown(state, 'ArrowDown'), 'ArrowDown'), 'ArrowDown');
  assert.equal(state.activeIndex, 2);
});

test('toggling the active row adds and removes it', () => {
  let state = createAssignees(PEOPLE);
  state = toggleActive(state);
  assert.ok(state.selected.has('kdavies'));
  state = toggleActive(state);
  assert.equal(state.selected.size, 0);
});

test('each row carries the name and the open-task count', () => {
  const rendered = renderAssignees(createAssignees(PEOPLE));
  assert.equal(rendered.rows[1].text, 'Nadia Soto - 0 open tasks');
  assert.equal(rendered.rows.length, 3);
});
