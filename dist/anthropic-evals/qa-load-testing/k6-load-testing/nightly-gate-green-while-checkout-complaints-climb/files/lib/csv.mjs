export function parseCsv(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((key, i) => {
      const raw = cells[i];
      const num = Number(raw);
      row[key] = raw !== '' && !Number.isNaN(num) ? num : raw;
    });
    return row;
  });
}
