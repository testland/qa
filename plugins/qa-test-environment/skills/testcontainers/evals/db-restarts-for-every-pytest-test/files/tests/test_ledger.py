from decimal import Decimal

from myapp.ledger import Ledger


def test_records_a_credit(db_url):
    ledger = Ledger(db_url)

    ledger.credit(account="ada", amount=Decimal("42.00"))

    assert ledger.balance("ada") == Decimal("42.00")


def test_balance_of_an_unknown_account_is_zero(db_url):
    ledger = Ledger(db_url)

    assert ledger.balance("nobody") == Decimal("0.00")


def test_totals_across_all_accounts(db_url):
    ledger = Ledger(db_url)
    ledger.credit(account="ada", amount=Decimal("42.00"))
    ledger.credit(account="bob", amount=Decimal("8.00"))

    assert ledger.total() == Decimal("50.00")
