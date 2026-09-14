# Q3 dependency review - ledger-api

Open items carried into Q4:

| Package | Installed | Advisory                                   | Fixed in | Status                        |
|---------|-----------|--------------------------------------------|----------|-------------------------------|
| `ws`    | 7.5.9     | DoS via excessive HTTP headers (high)       | 7.5.10   | not applied - no owner        |
| `pg`    | 8.11.5    | none open                                   | -        | -                             |

Notes:

- `ws` 7.5.10 is a patch on the 7.x line. It does not carry the v8 handshake
  changes that broke our proxy tests in the June spike (see spike notes in
  #4471); the proxy test failures were only ever reproduced against 8.x.
- Auditor asked in July how we evidence that the production branch receives
  vulnerability fixes. We did not have an answer written down.
