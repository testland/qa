# CI policy - PR feedback

- **Target:** PR feedback completes within 30 minutes. Agreed at the
  engineering all-hands on 2026-03-04 and not revised since.
- **Now:** 41 minutes wall clock. 118 end-to-end tests, 152 minutes serial,
  four shards.
- We have been over the target since week 31 - five weeks.
- **Feature exemption (added week 32):** a PR shipping customer-facing work may
  add end-to-end tests without retiring or moving any. The suite is brought
  back under the target at the quarterly review. Added so feature delivery
  would stop being held up by the state of the suite.
- Standing note pinned in the CI channel since week 32: *"suite review
  scheduled for next quarter, please do not add more shards."*
- Feature PRs that have used the exemption: #1163 (+4.1 min), #1184 (+3.3 min),
  #1199 (+5.2 min). None of the three retired or moved anything.
