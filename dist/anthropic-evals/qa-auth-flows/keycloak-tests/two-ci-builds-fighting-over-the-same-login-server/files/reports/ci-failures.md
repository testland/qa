# auth-integration, 2026-08-22 to 2026-09-12

187 runs, 23 failures. Every failure below, in order. The last column is how many
other runs of this same job the runner had in flight at the moment of the failure.

| Run  | Started  | Failing test                            | Others in flight |
|------|----------|-----------------------------------------|------------------|
| 4408 | 09:51:07 | test_provisioned_user_can_be_found      | 1 |
| 4419 | 11:02:33 | test_provisioned_user_can_be_found      | 2 |
| 4423 | 11:47:51 | test_realm_has_exactly_the_seeded_users | 1 |
| 4431 | 14:19:08 | test_provisioned_user_can_be_found      | 1 |
| 4444 | 08:33:20 | test_provisioned_user_can_be_found      | 1 |
| 4450 | 10:11:59 | test_realm_has_exactly_the_seeded_users | 1 |
| 4458 | 13:40:12 | test_provisioned_user_can_be_found      | 3 |
| 4463 | 15:55:41 | test_provisioned_user_can_be_found      | 1 |
| 4470 | 09:14:02 | test_provisioned_user_can_be_found      | 1 |
| 4471 | 09:14:02 | test_provisioned_user_can_be_found      | 1 |
| 4477 | 10:48:16 | test_realm_has_exactly_the_seeded_users | 2 |
| 4483 | 12:30:45 | test_provisioned_user_can_be_found      | 1 |
| 4488 | 16:02:19 | test_realm_has_exactly_the_seeded_users | 1 |
| 4491 | 08:58:04 | test_provisioned_user_can_be_found      | 1 |
| 4495 | 09:39:27 | test_provisioned_user_can_be_found      | 2 |
| 4499 | 11:15:50 | test_realm_has_exactly_the_seeded_users | 1 |
| 4502 | 14:22:44 | test_realm_has_exactly_the_seeded_users | 0 |
| 4507 | 15:44:31 | test_provisioned_user_can_be_found      | 1 |
| 4511 | 09:07:12 | test_provisioned_user_can_be_found      | 2 |
| 4514 | 10:52:38 | test_realm_has_exactly_the_seeded_users | 1 |
| 4519 | 15:06:02 | test_realm_has_exactly_the_seeded_users | 0 |
| 4523 | 16:31:09 | test_provisioned_user_can_be_found      | 1 |
| 4528 | 08:44:55 | test_provisioned_user_can_be_found      | 1 |

## Run 4471 - the shape 14 of these take

```
tests/auth/test_user_provisioning.py::test_provisioned_user_can_be_found FAILED
E   assert 409 == 201
```

Run 4470 was inside the same test at 09:14:02 and passed.

## Run 4488 - the shape 7 of these take

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'qa-probe', 'qa-probe'] == ['alice', 'bob', 'qa-probe']
```

## Run 4502

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'mchen-manual-test', 'qa-probe'] == ['alice', 'bob', 'qa-probe']
```

## Run 4519

```
tests/auth/test_user_provisioning.py::test_realm_has_exactly_the_seeded_users FAILED
E   assert ['alice', 'bob', 'qa-probe', 'rotation-test-01'] == ['alice', 'bob', 'qa-probe']
```
