# Deploy checks, 2026-09-08 to 2026-09-12

#4180 (copy refresh) and #4186 (button classes) both merged Tuesday 14:00.

| Deploy      | Result | Failing checks |
|-------------|--------|----------------|
| Tue 14:02   | red    | home page, pricing page, checkout page, order confirmation, primary button styling |
| Tue 16:40   | red    | same five |
| Wed 09:15   | red    | same five |
| Wed 11:50   | green  | reverted build, pre-#4180 |
| Wed 15:30   | red    | same five |
| Thu 10:05   | red    | same five |
| Thu 17:20   | green  | reverted build, pre-#4180 |
| Fri 09:40   | red    | same five — overridden by hand, shipped |
| Fri 13:15   | red    | same five — overridden by hand, shipped |

Channel history:

- Tue, @marek: "it's copy, the checks are just stale"
- Wed, @dana: "can we put --retries=4 on it until this settles down"
- Wed: PR #4203 opened — pastes the current home-page markup into the home-page
  check. Three more of the same queued behind it.
- Thu, @marek: "honestly these have cost us more this quarter than they have
  caught, I'd drop them"

Nothing in the checkout or order flow was reported by a customer this week, but
support is closed at weekends and Friday's two deploys went out unguarded.
