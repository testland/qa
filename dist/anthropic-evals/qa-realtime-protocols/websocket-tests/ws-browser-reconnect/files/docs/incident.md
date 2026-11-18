After a deploy restarted all gateway pods, 40k browsers reconnected within the same second and the
new pods fell over again. Revoked sessions also reconnect forever: the server closes them with 4401.
QA reports that logging out throws "InvalidAccessError" in Chrome, but our unit test passes.
