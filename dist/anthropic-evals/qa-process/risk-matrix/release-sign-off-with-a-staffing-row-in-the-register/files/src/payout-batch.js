export function runBatch(lines, alreadyPaidIds = new Set()) {
  const paid = [];
  const skipped = [];
  for (const line of lines) {
    if (alreadyPaidIds.has(line.id)) {
      skipped.push(line.id);
      continue;
    }
    paid.push(line.id);
  }
  return { paid, skipped };
}
