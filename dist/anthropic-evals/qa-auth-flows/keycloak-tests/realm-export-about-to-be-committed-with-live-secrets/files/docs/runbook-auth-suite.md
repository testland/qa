# Running the auth suite by hand

Normally you just run `pytest tests/auth -v` and the container does the rest.

If a grant is failing and you want to poke the server directly, leave the suite
running with `-x --pdb`, take the mapped port off the container, and:

```bash
curl -s -X POST "http://localhost:$PORT/realms/corp-staging/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=corp-portal \
  -d client_secret=f9a03d17-6e52-49c8-b1aa-72c4e0d5913b \
  -d username=alice \
  -d 'password=Sp1ng-2026!alice' | jq .
```

If that returns a token and the test does not, the problem is in the test.

## Known rough edges

- The container takes about 9 seconds to come up on a cold image pull.
- The realm import is skipped silently if a realm of the same name already
  exists, which only matters if you reuse a container by hand.
