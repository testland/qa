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
