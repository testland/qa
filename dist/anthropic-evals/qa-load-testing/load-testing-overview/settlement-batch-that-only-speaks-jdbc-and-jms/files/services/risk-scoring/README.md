# risk-scoring

`POST /v1/score` - synchronous, p99 budget 120 ms, called on every authorisation.
The budget is in the service's SLO and is the number the memo expects CI to gate.

Every request must carry `X-Kestrel-Signature`, computed by `kestrel_sig`, an
internal Python package (wheel on the internal index). It derives a per-merchant
key through a KDF, canonicalises the body, and signs. The crypto team's policy,
restated on 2026-08-19 in writing: **one implementation, in Python, audited
annually.** They will not review or support a second one, including a test-only
copy.

The team that owns risk-scoring is four data scientists. They write Python all
day and no JavaScript at all.
