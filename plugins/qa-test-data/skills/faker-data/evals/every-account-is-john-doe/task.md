# Nothing in the suite ever inserts a second account

## Problem Description

`tests/factories.py` hands back the same person every time: John Doe,
`johndoe`, `john.doe@example.com`. The repository has unique constraints on the
username and the email, so the second `repo.add(make_account())` in any test
raises, and over time everybody just stopped writing tests that add more than
one account.

That has cost us. The signup endpoint returned a 500 instead of a 409 for a
duplicate email for eight months and no test noticed, because no test ever got
as far as a duplicate. The search test cannot tell records apart - every record
matches every query. The load-test seeder that builds 5,000 accounts had to
grow its own counter to get past the constraints, so its data looks nothing like
the data the tests use.

## Output Specification

1. `make_account()` must return a distinct, realistic account on every call: a
   person's name, a username and an email address that no other generated
   account in the same run shares.
2. Prove it: a test that builds 5,000 accounts in one run and finds no
   collision on either constrained field.
3. A suite must be able to add many accounts to one repository without tripping
   the unique constraints by accident.
4. Add a test that deliberately adds a duplicate email and expects the conflict
   the repository raises - that path must be exercised on purpose.
5. One test's generation must not affect another test's - the suite must pass
   whether it runs whole or a single test runs alone, and a failing run must be
   repeatable.
6. Do not edit `repository.py`. `pytest` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: requirements-dev.txt ===============
Faker
pytest

=============== FILE: conftest.py ===============
# Present so pytest puts the project root on sys.path.

=============== FILE: repository.py ===============
class DuplicateEmail(Exception):
    pass


class DuplicateUsername(Exception):
    pass


class AccountRepository:
    def __init__(self):
        self._by_email = {}
        self._by_username = {}

    def add(self, account):
        email = account["email"].lower()
        username = account["username"].lower()
        if email in self._by_email:
            raise DuplicateEmail(email)
        if username in self._by_username:
            raise DuplicateUsername(username)
        self._by_email[email] = account
        self._by_username[username] = account
        return account

    def search(self, term):
        needle = term.lower()
        return [a for a in self._by_email.values() if needle in a["name"].lower()]

    def count(self):
        return len(self._by_email)

=============== FILE: tests/factories.py ===============
from faker import Faker

fake = Faker()


def make_account(**overrides):
    account = {
        "id": fake.uuid4(),
        "name": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Acme Inc",
        "signed_up_at": "2020-01-01T00:00:00Z",
    }
    account.update(overrides)
    return account

=============== FILE: tests/test_accounts.py ===============
from factories import make_account
from repository import AccountRepository


def test_an_added_account_is_counted():
    repo = AccountRepository()

    repo.add(make_account())

    assert repo.count() == 1


def test_search_finds_an_account_by_part_of_the_name():
    repo = AccountRepository()
    account = repo.add(make_account())

    assert repo.search(account["name"][:3]) == [account]
