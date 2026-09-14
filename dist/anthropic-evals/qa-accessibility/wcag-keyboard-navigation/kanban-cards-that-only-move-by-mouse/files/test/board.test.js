import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard } from '../src/board.js';

const CARDS = [
  { id: 'c1', title: 'Invoice PDF renders blank', column: 'backlog', position: 0, tabOrder: 1 },
  { id: 'c2', title: 'Rotate signing keys', column: 'backlog', position: 1, tabOrder: 2 },
  { id: 'c3', title: 'SSO retry storm', column: 'in-progress', position: 0, tabOrder: 3 },
];

test('cards come back in position order', () => {
  const board = createBoard(CARDS);
  assert.deepEqual(board.cardsIn('backlog').map((c) => c.id), ['c1', 'c2']);
});

test('a drag moves a card into another column at an index', () => {
  const board = createBoard(CARDS);
  const ok = board.onDragEnd({ cardId: 'c2', toColumn: 'in-progress', toIndex: 0 });
  assert.equal(ok, true);
  assert.deepEqual(board.cardsIn('in-progress').map((c) => c.id), ['c2', 'c3']);
  assert.deepEqual(board.cardsIn('backlog').map((c) => c.id), ['c1']);
});

test('a drag to a column that does not exist is refused', () => {
  const board = createBoard(CARDS);
  assert.equal(board.onDragEnd({ cardId: 'c1', toColumn: 'archive', toIndex: 0 }), false);
});

test('enter and space both open the card under the cursor', () => {
  const board = createBoard(CARDS);
  const opened = [];
  const handlers = { openCard: (id) => opened.push(id) };
  assert.equal(board.activate({ key: 'Enter', cardId: 'c1' }, handlers), true);
  assert.equal(board.activate({ key: ' ', cardId: 'c2' }, handlers), true);
  assert.deepEqual(opened, ['c1', 'c2']);
});

test('card markup carries the title for assistive technology', () => {
  const board = createBoard(CARDS);
  assert.match(board.cardMarkup(CARDS[0]), /aria-label="Invoice PDF renders blank"/);
});

test('a move leaves the contractor tab numbers as they were', () => {
  const board = createBoard(CARDS);
  board.onDragEnd({ cardId: 'c2', toColumn: 'done', toIndex: 0 });
  assert.deepEqual(board.state.cards.map((c) => c.tabOrder), [1, 2, 3]);
});
