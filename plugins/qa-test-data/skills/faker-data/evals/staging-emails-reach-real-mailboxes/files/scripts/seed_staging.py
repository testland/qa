import sys

sys.path.append("tests")

from factories import make_account  # noqa: E402
from signup import SignupService  # noqa: E402
from staging_gateway import SmtpMailer  # noqa: E402

if __name__ == "__main__":
    service = SignupService(SmtpMailer(host="smtp-relay.nortonlabs.io"))
    for _ in range(int(sys.argv[1])):
        service.register(make_account())
