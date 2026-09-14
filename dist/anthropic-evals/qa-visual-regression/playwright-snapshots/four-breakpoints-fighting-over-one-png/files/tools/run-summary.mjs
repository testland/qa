export function rollUpByDay(rows) {
  const byDay = new Map();
  for (const row of rows) {
    const day = byDay.get(row.date) ?? { date: row.date, red: 0, green: 0 };
    if (row.failed > 0) day.red += 1;
    else day.green += 1;
    byDay.set(row.date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function redRate(days) {
  const red = days.reduce((n, d) => n + d.red, 0);
  const total = days.reduce((n, d) => n + d.red + d.green, 0);
  return total === 0 ? 0 : Math.round((red / total) * 100);
}
