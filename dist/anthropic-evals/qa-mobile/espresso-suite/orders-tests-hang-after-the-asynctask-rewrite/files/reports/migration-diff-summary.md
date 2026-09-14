# What the 2026-08-28 migration changed

Removed, from `OrdersRepository`:

```
private class FetchOrdersTask(...) : AsyncTask<Void, Void, List<Order>>() {
    override fun doInBackground(vararg p: Void?): List<Order> = api.ordersBlocking()
    override fun onPostExecute(result: List<Order>) = onResult(result)
}
```

Added: the Retrofit `enqueue` call sites now in `OrdersRepository.kt`.

Nothing else changed. Specifically unchanged:

- `activity_orders.xml` - same ids, same view types, same `RecyclerView`.
- `OrdersActivity` - still constructs the repository in `onCreate` and still
  calls `repository.loadOrders { adapter.submit(it) }` from `onStart`, on the
  main thread. Tapping a row calls `repository.loadOrderDetail(...)`.
- The API responses, the fixtures the emulator talks to, and the test data. The
  detail fixture for one of the three seeded orders is still missing upstream,
  which is why one of the interceptor lines above is a 404.
- Every other test class in `androidTest`, all still green.
