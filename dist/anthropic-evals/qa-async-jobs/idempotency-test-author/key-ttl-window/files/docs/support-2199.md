# Support 2199 - "my second top-up never went through", 2025-11-20

A customer bought the same 4.99 top-up twice within ninety seconds and only the
first was charged.

At the time the key was derived from a hash of the request body, so the second
purchase was indistinguishable from a retry of the first and was suppressed.

**Action taken:** the key stopped being derived from the request body. Two
purchases that happen to look alike are two purchases, and nothing about the
payload can tell them apart.
