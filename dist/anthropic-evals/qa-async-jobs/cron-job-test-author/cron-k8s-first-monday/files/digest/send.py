from digest.db import customers, send_email

def main():
    for c in customers():
        send_email(c.email, "Your monthly digest", render(c))
