from faker import Faker

fake = Faker()


def make_account(**overrides):
    account = {
        "id": fake.uuid4(),
        "name": fake.name(),
        "email": fake.free_email(),
        "work_email": f"{fake.user_name()}@nortonlabs.io",
        "website": fake.url(),
        "phone": fake.phone_number(),
        "company": fake.company(),
    }
    account.update(overrides)
    return account
