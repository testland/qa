Security review findings:
1. A page on another site could open a WebSocket to app.example.com and read a logged-in user's account stream.
2. Long-lived API tokens appear in the load balancer access logs.
3. Unauthenticated sockets are accepted and only closed afterwards.
4. The `headers` option in client.js does nothing in browsers.
