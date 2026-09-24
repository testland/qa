export function reconcile(page, sink) {
  let written = 0;
  for (const event of page.events) {
    sink.write(event);
    written++;
  }
  return { ok: true, written };
}
