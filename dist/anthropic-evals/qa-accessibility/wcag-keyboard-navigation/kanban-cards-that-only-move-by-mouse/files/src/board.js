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
