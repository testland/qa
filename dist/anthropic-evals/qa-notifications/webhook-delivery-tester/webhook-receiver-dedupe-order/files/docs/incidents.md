- The provider times out after 15 s and retries; customers got two welcome emails for one event.
- A customer's plan shows "trial" although they upgraded: subscription.updated (plan=pro) arrived first,
  then a delayed subscription.created (plan=trial) overwrote it.
- verifySignature recomputes the HMAC over JSON.stringify(req.body).
