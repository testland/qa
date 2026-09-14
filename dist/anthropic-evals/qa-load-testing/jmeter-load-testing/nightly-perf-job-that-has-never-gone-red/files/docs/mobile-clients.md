# Payments clients — timeouts and expectations

| Client            | Request timeout | Retries | Notes                            |
|-------------------|-----------------|---------|----------------------------------|
| iOS 6.x           | 30 s            | 2       | user sees a spinner the whole time |
| Android 6.x       | 30 s            | 2       | same                              |
| Web checkout      | 60 s            | 0       | shows an error page after that    |
| Partner API       | 15 s            | 1       | contractual, see MSA schedule 3   |

Card list and balance are rendered inline on the account screen; product has
asked for those to stay under half a second since the redesign. Checkout is a
single call at the end of the flow and has never had a written target, which is
part of why nobody noticed it moving.
