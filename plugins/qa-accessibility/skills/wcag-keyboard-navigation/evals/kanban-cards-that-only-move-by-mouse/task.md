# The board audit item is still open after we "added the ARIA"

## Problem Description

Item A-31 on the accessibility backlog — "board is not usable without a mouse"
— has been open since March. Last sprint a contractor closed it by adding
`role="button"`, an `aria-label` and an explicit tab position to every card,
and our tester reopened it the same afternoon. She can land on a card now. She
still cannot open one from the keyboard and she still cannot move one.

Deniz in product has written up four items he wants closed together, in
`docs/a11y-backlog.md`. His position in the planning doc is "all four, no
exceptions — I do not want to explain to a customer why three of the four are
fixed", and he has the CTO agreeing with him in the thread. The contractor's
tab numbering is the part he is proudest of, because it is the one change with
a before-and-after video attached, and B-3 asks for more of it.

I am not going to argue with Deniz from instinct. Go through B-1 to B-4, do the
work for the ones that should be done, and for anything you are not doing write
the argument down properly, because he will push back and I need something I
can send him rather than repeat.

Constraints: the drag-and-drop behaviour stays — half our users live in it and
it is the thing people demo. Whatever you add is in addition to dragging, not
instead of it. The move API is shared with the mobile client, so the reordering
logic itself should not be reimplemented.

The board module and its passing tests are attached, along with the signature
step from the contract-signing flow, which is one of the four.

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

// Focus mode renders the columns right-to-left; the DOM order is unchanged.
export const FOCUS_MODE_ORDER = {
  backlog: 4,
  'in-progress': 3,
  review: 2,
  done: 1,
};

export function createBoard(cards) {
  const state = { cards: cards.map((c) => ({ ...c })) };

  function cardsIn(column) {
    return state.cards
      .filter((c) => c.column === column)
      .sort((a, b) => a.position - b.position);
  }

  function columnStyleFor(column) {
    return { order: FOCUS_MODE_ORDER[column] };
  }

  function cardMarkup(card) {
    return (
      `<div class="card" draggable="true" role="button" aria-label="${card.title}"` +
      ` tabindex="${card.tabOrder}" data-card-id="${card.id}"` +
      ` onclick="board.openCard('${card.id}')">` +
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
    if (event.key === 'Enter' || event.key === ' ') {
      handlers.openCard(event.cardId);
      return true;
    }
    return false;
  }

  return { state, cardsIn, columnStyleFor, cardMarkup, moveCard, onDragEnd, activate };
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

=============== FILE: docs/a11y-backlog.md ===============
# A-31 breakdown — Deniz K., planning doc

Closing A-31 means closing all four of these. I do not want to explain to a
customer why three of the four are fixed.

## B-1 — Moving a card between columns

Today a card only changes column by being dragged with a pointer. There is no
other way to do it anywhere in the product. Reported by two enterprise
accounts and by our own tester.

## B-2 — Opening a card

Clicking a card opens its detail panel. Our tester can land on a card now but
says pressing Enter on one does nothing; she has to reach for the mouse. The
handler in the module looks right to me, so I assume this is a wiring job.

## B-3 — Extending the tab numbering to the rest of the board

Background for anyone who missed it: in focus mode the columns are laid out
right-to-left while the markup still emits them left-to-right, so tabbing used
to walk the board in an order that matched nothing on screen. The contractor
gave every card an explicit tab position (1, 2, 3, ... across the board in
visual order) and the tester's follow-up video shows the order correct for the
first time. Video is in the ticket.

I want that same treatment applied to the column headers, the overflow menus
and whatever keyboard controls come out of B-1, so the whole board has one
predictable order instead of half of one. This is the item I care most about —
it is the only change so far with proof attached.

## B-4 — Signing the contract

The signature step on the contract-signing flow asks the signer to draw their
signature on the pad with a pointer. A keyboard-only user cannot draw a
signature. Deniz wants this made operable by keyboard like the rest.
