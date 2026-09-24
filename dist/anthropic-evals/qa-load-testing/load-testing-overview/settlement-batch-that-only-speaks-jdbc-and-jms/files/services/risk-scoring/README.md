# risk-scoring

`POST /v1/score/{merchant_id}` - synchronous, called on every authorisation.
**p99 budget 120 ms**, set in the service SLO, and the number the memo expects CI
to gate. Weekday peak is around 1,900 authorisations a second.

`GET /v1/models/current` - returns the active model id and version. Cached in
process, single-digit milliseconds, no signature required. The console polls it,
and so does the load test, to record which model a run scored against.

Every scoring request must carry `X-Kestrel-Signature`, computed by `kestrel_sig`,
an internal Python package (wheel on the internal index). It derives a per-merchant
key through a KDF, canonicalises the body, and signs. The crypto team's policy,
restated on 2026-08-19 in writing: **one implementation, in Python, audited
annually.** They will not review or support a second one, including a test-only
copy.

`tests/load/merchants.txt` is regenerated nightly from the staging merchant table -
12,140 ids as of Tuesday.

The team that owns risk-scoring is four data scientists. They write Python all day
and no JavaScript at all.
