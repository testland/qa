"""Addresses of the identity server endpoints the suite uses."""

BASE = "http://localhost:8080"
REALM = "corp"


def token_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/token"


def introspect_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/token/introspect"


def userinfo_url():
    return f"{BASE}/realms/{REALM}/protocol/openid-connect/userinfo"


def discovery_url():
    return f"{BASE}/realms/{REALM}/.well-known/openid-configuration"
