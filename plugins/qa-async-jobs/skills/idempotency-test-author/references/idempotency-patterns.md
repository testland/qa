# Idempotency patterns: commutative side effects and concurrency

Deeper patterns referenced from `idempotency-test-author`'s SKILL.md
(Step 4 and Step 6). The core idempotency-key pattern stays in the
main skill file.

## Side-effect commutativity for non-key designs

Some systems can't add idempotency keys (legacy webhook receivers,
existing APIs). For these, make the side effect idempotent with a
transaction-id / fingerprint and an atomic upsert.

```python
# NON-idempotent (counter increment):
def credit_account(account_id, amount):
    db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s",
               (amount, account_id))

# IDEMPOTENT (use a transaction-id / fingerprint):
def credit_account(account_id, amount, txn_id):
    cursor = db.execute(
        "INSERT INTO transactions(txn_id, account_id, amount) VALUES (%s, %s, %s) "
        "ON CONFLICT (txn_id) DO NOTHING RETURNING id",
        (txn_id, account_id, amount)
    )
    if cursor.rowcount == 0:
        return  # duplicate; skip
    db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s",
               (amount, account_id))
```

Test pattern:

```python
def test_credit_idempotent_via_txn_id():
    credit_account(account_id=1, amount=100, txn_id="t-1")
    credit_account(account_id=1, amount=100, txn_id="t-1")   # duplicate
    assert get_balance(1) == 100   # not 200
```

## Race-condition test (concurrent duplicate)

The hardest case: two requests with the same idempotency key arrive
simultaneously. Without an atomic store + check, both can pass the
"is this duplicate?" check.

```python
def test_concurrent_duplicate_processed_only_once(endpoint, charge_processor):
    key = "race-key"
    charge = {"amount": 100}

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(endpoint.post_charge, key, charge)
        f2 = executor.submit(endpoint.post_charge, key, charge)
        r1, r2 = f1.result(), f2.result()

    assert r1 == r2
    assert charge_processor.execute.call_count == 1   # NOT 2
```

The implementation must use atomic CAS (e.g., a DB unique constraint
on the `idempotency_key` column with `ON CONFLICT DO NOTHING`, or
Redis `SETNX`).
