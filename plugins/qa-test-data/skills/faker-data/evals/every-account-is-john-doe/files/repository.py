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
