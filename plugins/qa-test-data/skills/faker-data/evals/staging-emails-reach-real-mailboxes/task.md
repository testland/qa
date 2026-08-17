# Staging seeding sent 214 welcome emails to real people

## Problem Description

Our staging environment is seeded by `scripts/seed_staging.py`, which registers
accounts through the real signup service. Signup sends a welcome message
through the staging mail gateway, and the gateway is wired to the live SMTP
relay because we want to test the relay.

Last Thursday's refresh created 214 accounts and every one of them got a
welcome email delivered somewhere real. Most went to addresses at the free
providers the factory hands out. Twelve went to `@nortonlabs.io`, which is our
own marketing domain, and the marketing team noticed. Support also had two
bounce complaints from strangers whose addresses the generator happened to
reproduce.

The `website` field has the same problem - the profile page renders it as a
live link, and a QA session last month clicked one straight out to somebody
else's shop.

## Output Specification

1. No value the factory or the seeding script can produce may be deliverable or
   resolvable to anyone: not the free providers, not our own domains, not a
   plausible-looking one the generator invents that somebody may have
   registered.
2. This covers every field carrying a hostname - the personal address, the work
   address and the website - not only the primary email.
3. Add a test proving it over a large sample (several hundred accounts in one
   run), and the sample must be the same on every run so a failure can be
   chased.
4. The values must stay varied and realistic. One constant address for every
   account is not acceptable - the accounts have to be distinguishable in the
   staging UI.
5. Do not edit `signup.py`. `pytest` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: requirements-dev.txt ===============
Faker
pytest

=============== FILE: conftest.py ===============
# Present so pytest puts the project root on sys.path.

=============== FILE: signup.py ===============
class DuplicateEmail(Exception):
    pass


class StubMailer:
    def __init__(self):
        self.sent = []

    def send(self, to, subject, body):
        self.sent.append({"to": to, "subject": subject, "body": body})


class SignupService:
    def __init__(self, mailer):
        self.mailer = mailer
        self.accounts = {}

    def register(self, account):
        key = account["email"].lower()
        if key in self.accounts:
            raise DuplicateEmail(key)
        self.accounts[key] = account
        self.mailer.send(key, "Welcome to Norton Labs", f"Hi {account['name']}")
        return account

    def find(self, email):
        return self.accounts.get(email.lower())

=============== FILE: tests/factories.py ===============
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

=============== FILE: tests/test_signup.py ===============
from factories import make_account
from signup import SignupService, StubMailer


def test_registering_an_account_sends_one_welcome_email():
    mailer = StubMailer()
    service = SignupService(mailer)

    service.register(make_account())

    assert len(mailer.sent) == 1


def test_a_registered_account_can_be_found_by_email():
    mailer = StubMailer()
    service = SignupService(mailer)
    account = make_account()

    service.register(account)

    assert service.find(account["email"].upper()) is not None

=============== FILE: scripts/seed_staging.py ===============
import sys

sys.path.append("tests")

from factories import make_account  # noqa: E402
from signup import SignupService  # noqa: E402
from staging_gateway import SmtpMailer  # noqa: E402

if __name__ == "__main__":
    service = SignupService(SmtpMailer(host="smtp-relay.nortonlabs.io"))
    for _ in range(int(sys.argv[1])):
        service.register(make_account())
