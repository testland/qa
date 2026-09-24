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
