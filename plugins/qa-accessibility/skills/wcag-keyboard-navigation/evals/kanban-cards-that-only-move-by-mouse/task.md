# The board audit item is still open after we "added the ARIA"

## Problem Description

Item A-31 on the accessibility backlog — "board is not usable without a mouse"
— has been open since March. Last sprint a contractor closed it by adding
`role="button"` and an `aria-label` to every card, and our tester reopened it
the same afternoon with the note "I still cannot get to a card with the
keyboard, and I still cannot move one." She is right. Whatever we shipped, it
did not move the needle, and I would like to understand why before we spend
another sprint on it.

Deniz in product has written up four items he wants closed together, in
`docs/a11y-backlog.md`. His position in the planning doc is "all four, no
exceptions — I do not want to explain to a customer why three of the four are
fixed." I do not think that position survives contact with the fourth item, but
I want that argued rather than asserted, because he will push back.

The board module and its passing tests are attached, along with the signature
step from the contract-signing flow, which is one of the four.

Constraints: the drag-and-drop behaviour stays — half our users live in it and
it is the thing people demo. Whatever you add is in addition to dragging, not
instead of it. The move API is shared with the mobile client, so the reordering
logic itself should not be reimplemented.

## Output Specification

1. Change `src/board.js` for the items you accept. `createBoard` and the shape
   it returns are consumed by the web client and the mobile bridge — keep the
   exported surface working, and keep the drag path working.
2. Add cases to `test/board.test.js` that are red against the module as supplied
   and green after your change. The suite must keep running under `node --test`.
3. Write `docs/keyboard-remediation.md`: one section per backlog item B-1..B-4,
   what you changed, and for anything you are not changing, the argument Deniz
   is going to want.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "boards-web",
  "version": "5.2.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/board.js ===============
export const COLUMNS = ['backlog', 'in-progress', 'review', 'done'];

export function createBoard(cards) {
  const state = { cards: cards.map((c) => ({ ...c })) };

  function cardsIn(column) {
    return state.cards
      .filter((c) => c.column === column)
      .sort((a, b) => a.position - b.position);
  }

  function cardMarkup(card) {
    return (
      `<div class="card" draggable="true" role="button" aria-label="${card.title}"` +
      ` data-card-id="${card.id}" onclick="board.openCard('${card.id}')">` +
      `<span class="card-title">${card.title}</span>` +
      `<span class="card-handle" aria-hidden="true">drag</span>` +
      `</div>`
    );
  }

  function moveCard(cardId, toColumn, toIndex) {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card || !COLUMNS.includes(toColumn)) return false;

    const remaining = cardsIn(card.column).filter((c) => c.id !== cardId);
    remaining.forEach((c, i) => {
      c.position = i;
    });

    const target = cardsIn(toColumn).filter((c) => c.id !== cardId);
    const index = Math.max(0, Math.min(toIndex, target.length));
    target.splice(index, 0, card);
    card.column = toColumn;
    target.forEach((c, i) => {
      c.position = i;
    });

    return true;
  }

  function onDragEnd(dragEvent) {
    return moveCard(dragEvent.cardId, dragEvent.toColumn, dragEvent.toIndex);
  }

  function activate(event, handlers) {
    if (event.key === 'Enter') {
      handlers.openCard(event.cardId);
      return true;
    }
    return false;
  }

  return { state, cardsIn, cardMarkup, onDragEnd, activate };
}

=============== FILE: src/signature-pad.js ===============
// Contract-signing step: the signer draws their signature with a pointer.
export function createSignaturePad(surface) {
  const strokes = [];
  let current = null;

  surface.onPointerDown = (e) => {
    current = [{ x: e.x, y: e.y, t: e.t }];
  };

  surface.onPointerMove = (e) => {
    if (!current) return;
    current.push({ x: e.x, y: e.y, t: e.t });
  };

  surface.onPointerUp = () => {
    if (current && current.length > 1) strokes.push(current);
    current = null;
  };

  return {
    strokes,
    clear() {
      strokes.length = 0;
    },
    isEmpty() {
      return strokes.length === 0;
    },
  };
}

=============== FILE: test/board.test.js ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard } from '../src/board.js';

const CARDS = [
  { id: 'c1', title: 'Invoice PDF renders blank', column: 'backlog', position: 0 },
  { id: 'c2', title: 'Rotate signing keys', column: 'backlog', position: 1 },
  { id: 'c3', title: 'SSO retry storm', column: 'in-progress', position: 0 },
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

test('enter opens the card under the cursor', () => {
  const board = createBoard(CARDS);
  const opened = [];
  const handled = board.activate(
    { key: 'Enter', cardId: 'c1' },
    { openCard: (id) => opened.push(id) },
  );
  assert.equal(handled, true);
  assert.deepEqual(opened, ['c1']);
});

test('card markup carries the title for assistive technology', () => {
  const board = createBoard(CARDS);
  assert.match(board.cardMarkup(CARDS[0]), /aria-label="Invoice PDF renders blank"/);
});

=============== FILE: docs/a11y-backlog.md ===============
# A-31 breakdown — Deniz K., planning doc

Closing A-31 means closing all four of these. I do not want to explain to a
customer why three of the four are fixed.

## B-1 — Moving a card between columns

Today a card only changes column by being dragged with a pointer. There is no
other way to do it anywhere in the product. Reported by two enterprise
accounts and by our own tester.

## B-2 — Opening a card

Clicking a card opens its detail panel. Our tester says she cannot reach a card
at all to open one. The contractor added `role="button"` and `aria-label` to
the cards last sprint; the report did not change.

## B-3 — The card overflow menu

The three-dot menu on each card is a `<div role="button" tabindex="0">` with a
key handler. Our tester reaches it and it opens when she presses Enter. A
second tester on a different machine says it does not open for her; she says
she "pressed the button" and nothing happened. We have not reproduced it.

## B-4 — Signing the contract

The signature step on the contract-signing flow asks the signer to draw their
signature on the pad with a pointer. A keyboard-only user cannot draw a
signature. Deniz wants this made operable by keyboard like the rest.
