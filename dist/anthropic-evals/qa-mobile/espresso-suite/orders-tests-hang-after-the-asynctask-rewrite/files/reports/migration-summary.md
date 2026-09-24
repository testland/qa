# What the 2026-08-28 commit changed

Removed from `OrdersRepository`:

```
private class FetchOrdersTask(...) : AsyncTask<Void, Void, List<Order>>() {
    override fun doInBackground(vararg p: Void?): List<Order> = api.ordersBlocking()
    override fun onPostExecute(result: List<Order>) = onResult(result)
}
```

Added: the Retrofit `enqueue` call sites now in `OrdersRepository.kt`, and
`OrderStatusTicker`, which exists to refresh the status chip on the detail
screen on a five second cadence while that screen is in front of the user.

Unchanged in that commit:

- `activity_orders.xml` and `activity_order_detail.xml` - same ids, same view
  types, same `RecyclerView`.
- `OrdersActivity` still constructs the repository in `onCreate` and still calls
  `repository.loadOrders { adapter.submit(it) }` from `onStart`. Tapping a row
  starts `OrderDetailActivity`, which calls `repository.loadOrderDetail(...)`.
- The API responses and the seeded test data. The detail record for one of the
  three seeded orders is still missing upstream, which is why one of the gateway
  lines above is a 404; it has been that way since before the migration and the
  screen has always shown an error state for it.
- Every other class under `androidTest`, all still green.
