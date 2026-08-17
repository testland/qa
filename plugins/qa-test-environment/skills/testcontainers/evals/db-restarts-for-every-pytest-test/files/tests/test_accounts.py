from myapp.accounts import AccountRepository


def test_creates_an_account(db_url):
    repo = AccountRepository(db_url)

    repo.create(email="ada@example.com", name="Ada")

    assert repo.find_by_email("ada@example.com").name == "Ada"


def test_rejects_a_duplicate_email(db_url):
    repo = AccountRepository(db_url)
    repo.create(email="ada@example.com", name="Ada")

    try:
        repo.create(email="ada@example.com", name="Someone else")
        raise AssertionError("expected a duplicate-email error")
    except ValueError:
        pass


def test_lists_every_account(db_url):
    repo = AccountRepository(db_url)
    repo.create(email="ada@example.com", name="Ada")
    repo.create(email="bob@example.com", name="Bob")

    assert len(repo.list_all()) == 2
