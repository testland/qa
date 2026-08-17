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
