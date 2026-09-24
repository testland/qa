# Blank bodies and failed sessions - support summary, 2026-09-12

| app build | sessions sampled | outcome                                  |
|-----------|------------------|------------------------------------------|
| 4.1.0     | 400              | fine                                     |
| 3.4.2     | 400              | 400 connected, every message body blank  |
| 3.0.1     | 120              | 120 connected, every message body blank  |
| 2.9.0     | 60               | 0 connected; handshake reported as failed, client retries and fails again |

On 3.x, row count and timestamps are right in every sample; only the body text
is missing. 2.9.0 predates subprotocol support in the mobile client entirely -
it sends no offer - and it was connecting normally until the chat-v2 rollout.
