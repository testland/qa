# Session-management extended test patterns

Extends SKILL.md Steps 4, 5, and 7. Core patterns (cookie attributes,
session-fixation, timeouts, CSRF, single-device logout) stay in SKILL.md.

## Concurrent-session limits (Step 4)

```python
def test_concurrent_session_limit(client_a, client_b, base_url):
    client_a.login("alice", "alicepass")
    client_b.login("alice", "alicepass")   # second session

    # Per app config: either client_a's session is revoked, OR the
    # second login is rejected. Document the policy + test it:
    response_a = client_a.get(f"{base_url}/dashboard")
    response_b = client_b.get(f"{base_url}/dashboard")

    if app_policy == "single_session":
        assert response_a.status_code == 401   # a was revoked
        assert response_b.status_code == 200
    elif app_policy == "limited_concurrent":
        # both work; assert correct behavior
        ...
```

## Logout across all devices (Step 5)

```python
def test_logout_all_devices_invalidates_other_sessions(client_a, client_b, base_url):
    # alice logs in on two devices
    client_a.login("alice", "alicepass")
    client_b.login("alice", "alicepass")

    # alice triggers "logout from all devices" on client_a
    client_a.post(f"{base_url}/account/logout-all")

    # Both sessions must be dead
    assert client_a.get(f"{base_url}/dashboard").status_code == 401
    assert client_b.get(f"{base_url}/dashboard").status_code == 401
```

## Session binding (Step 7)

```python
def test_session_bound_to_user_agent(client, base_url):
    client.login("alice", "alicepass", user_agent="Mozilla/5.0 ...")
    cookie_value = client.cookies.get("sessionid")

    response = requests.get(
        f"{base_url}/dashboard",
        cookies={"sessionid": cookie_value},
        headers={"User-Agent": "Different-UA"},   # different UA
    )
    assert response.status_code == 401   # if UA-binding is enforced
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip Set-Cookie attribute test | Sessions transmitted insecurely; XSS-stealable cookies | Step 1 baseline |
| Logout = clear cookie only (no server-side invalidation) | Cookie replay continues to work | Step 5 negative test |
| Same session ID before + after login | Session-fixation vulnerable | Step 2 regenerate test |
| No absolute timeout | Sessions live forever; account-takeover blast radius huge | Step 3 |
| State-changing GET requests | Always vulnerable to CSRF | Convert to POST + CSRF token (Step 6) |
