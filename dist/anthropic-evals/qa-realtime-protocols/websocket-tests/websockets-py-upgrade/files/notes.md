After upgrading websockets from 12.0 to 15.0:
- TypeError: handler() missing 1 required positional argument: 'path'
- TypeError: ... got an unexpected keyword argument 'extra_headers'
- /healthz returns an error instead of OK.
- With pytest-xdist the tests fail with "address already in use".
