export function createLog() {
  return [];
}

export function append(log, entry) {
  if (!entry.agentId || !entry.orderId) throw new Error('agentId and orderId required');
  log.push(Object.freeze({ ...entry, seq: log.length + 1 }));
  return log[log.length - 1];
}

export function exportRange(log, fromSeq, toSeq) {
  return log.filter((e) => e.seq >= fromSeq && e.seq <= toSeq);
}
