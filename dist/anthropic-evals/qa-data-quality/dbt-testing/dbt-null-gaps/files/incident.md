# Two problems, dbt build green every night

1. On 3 November the loader for `raw.orders` stopped (expired credentials). No new
   orders reached the warehouse for 4 days. Every nightly `dbt build` passed.
2. When loading resumed, orders carried a new status code `C` (cancelled). 12% of
   orders now show an empty status on the revenue dashboard. Separately, guest
   checkout writes `customer_id` as NULL (about 3% of orders), and finance needs
   every order attributed either to a customer or explicitly to "guest".

`raw.orders._loaded_at` is the load timestamp the loader writes on every row.
