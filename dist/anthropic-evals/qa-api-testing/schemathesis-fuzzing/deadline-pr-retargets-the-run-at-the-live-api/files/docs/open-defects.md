# Open API defects reported by the last good run against staging (2026-08-20)

None of these has a fix merged. All three reproduce today against staging's
last good snapshot and against production.

| ID      | Operation                   | Reported as                                       | Status |
|---------|-----------------------------|---------------------------------------------------|--------|
| LED-771 | GET /v1/accounts            | 200 body omits `next`, which the document requires | open   |
| LED-774 | POST /v1/transfers          | 422 returned; document declares only 201 and 400   | open   |
| LED-780 | GET /v1/statements/{id}/pdf | 500 when `{id}` is an empty string                 | open   |

LED-780 has a customer ticket attached and is on the 1.10 list. LED-771 has
been open since June.
