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
