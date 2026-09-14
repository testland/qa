# Stream edge, as deployed 2026-08-04

| path        | port | listener transport | module               |
|-------------|------|--------------------|----------------------|
| /stream     | 8443 | HTTP/1.1           | src/upgrade.js       |
| /stream     |  443 | HTTP/2             | src/stream-h2.js     |
| /api/poll   |  443 | HTTP/1.1           | src/poll-fallback.js |

The 443 listener negotiates h2 over ALPN and does not downgrade. Both /stream
routes reach the same session and frame code once a connection is established;
they do not share the code that establishes one.
