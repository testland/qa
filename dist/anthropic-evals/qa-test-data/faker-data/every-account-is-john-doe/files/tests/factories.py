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
