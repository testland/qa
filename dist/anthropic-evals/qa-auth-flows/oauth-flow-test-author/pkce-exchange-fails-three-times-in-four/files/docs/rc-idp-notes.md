# RC IdP — what their integration page says

- Authorization code lifetime: 60 seconds, **single use**. A code is consumed
  by the first token request that presents it, whatever the outcome.
- Proof-key support: `S256` and `plain`. No configuration on our side; the
  method the client declares on the authorize request is the one applied.
- Access token lifetime: 900 seconds.
- Cutover: the old dev IdP is switched off **14 October, 18:00**.
