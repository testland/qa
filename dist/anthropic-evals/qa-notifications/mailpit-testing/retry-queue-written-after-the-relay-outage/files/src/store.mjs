const rows = new Map();

export const users = {
  put(u) {
    rows.set(u.id, { emailStatus: 'ok', ...u });
    return rows.get(u.id);
  },
  byId(id) {
    return rows.get(id);
  },
  byEmail(email) {
    return [...rows.values()].find((u) => u.email === email);
  },
  update(id, patch) {
    const cur = rows.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    rows.set(id, next);
    return next;
  },
  reset() {
    rows.clear();
  },
};
