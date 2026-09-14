# PR 4402 — a stricter payments key check

Merged 2026-06-11. Author @ingest-oncall. Approved @dpetrov.

`not_null` on `stg_payments.payment_key` has been paging the ingest rotation at
03:40 every night since the Stripe migration started. It is also weaker than
people here think it is: a key that arrives as a blank string sails straight
through it, and we have seen exactly that twice this year.

This swaps it for `key_populated`, which treats a blank or whitespace-only key as
missing as well as a null one. Strictly more coverage than the check it replaces,
and nothing in any model's SQL changes. Macro is in `macros/key_populated.sql`.

@dpetrov: approved. Good to have the blank-string case covered at last, and it is
an upgrade rather than a relaxation, which is the thing I cared about. Revisit
after the October cutover.
