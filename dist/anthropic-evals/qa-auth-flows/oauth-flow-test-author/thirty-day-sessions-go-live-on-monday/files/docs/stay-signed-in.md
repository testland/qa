# Stay signed in for 30 days — portal-spa

Shipped behind `flag.portal.longSession`, currently 5% of traffic.

## Behaviour

- Sign-in is unchanged.
- The access token lives 300 seconds. When a request comes back 401 the app
  calls the token endpoint with the refresh token it is holding and retries.
- The refresh token lives 30 days. It is kept in `localStorage` under
  `portal.session` so it survives a tab close and a browser restart.
- Signing out clears `portal.session`.

## Rollout

| Date | Step |
|---|---|
| 29 Sep | merged behind flag |
| 06 Oct | 5% of traffic |
| 20 Oct | 5% — no incidents, no support tickets attributed |
| 27 Oct | **100% + customer announcement, 09:00** |

## Open questions raised during build

- Should the refresh token go in `localStorage` or a cookie? Left in
  `localStorage`; revisit next quarter.
- Nothing else outstanding.
