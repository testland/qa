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
