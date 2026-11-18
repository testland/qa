Both files have the same columns:
- `chargeback`: the outcome, either "fraud" or "ok" (strings), known 60 days after the transaction
- `score`: the model's fraud probability, 0-1
- `amount`, `merchant_category`, `country`: inputs
There is no predicted-label column. The business flags a transaction when score >= 0.35.
