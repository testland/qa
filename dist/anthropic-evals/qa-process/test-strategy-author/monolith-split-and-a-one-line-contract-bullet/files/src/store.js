export function createStore() {
  return { invoices: new Map(), invoiceLines: new Map(), tx: null };
}

export function begin(store) {
  if (store.tx) throw new Error('transaction already open');
  store.tx = { invoices: new Map(store.invoices), invoiceLines: new Map(store.invoiceLines) };
}

export function commit(store) {
  if (!store.tx) throw new Error('no transaction');
  store.invoices = store.tx.invoices;
  store.invoiceLines = store.tx.invoiceLines;
  store.tx = null;
}

export function rollback(store) {
  if (!store.tx) throw new Error('no transaction');
  store.tx = null;
}

export function put(store, table, id, row) {
  (store.tx ? store.tx[table] : store[table]).set(id, row);
}

export function get(store, table, id) {
  return (store.tx ? store.tx[table] : store[table]).get(id);
}
