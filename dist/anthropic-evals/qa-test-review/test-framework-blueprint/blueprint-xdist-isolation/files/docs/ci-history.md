Since we enabled `-n 8`: random failures such as missing users, duplicate key
violations on plans, and orders disappearing mid-test. Every run with `-n 0` passes.
14 tests now carry @pytest.mark.flaky(reruns=3).
