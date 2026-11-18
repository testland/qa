Our identity provider revokes the previous access token whenever it issues a new one.
At 09:00, when the token expires, about 40 concurrent requests each refresh it, and most
of them then call the API with a revoked token and get 401. tests/test_auth.py passes.
Last month the identity provider was down for 2 minutes; whatever the fix is, the service
must recover by itself once it is back.
