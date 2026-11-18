# API test framework (draft by the lead)

- Runner: pytest 8 with pytest-xdist, `pytest -n 8` in CI to cut the 22-minute run.
- Database: one shared Postgres `api_test` database for the whole run.
- `conftest.py`: a session-scoped `db` fixture truncates every table and seeds reference
  data (countries, plans) once per test run.
- Tests may build on data created by earlier tests in the same module, for example
  `test_create_user` and then `test_login_user`.
- A test that fails intermittently gets `@pytest.mark.flaky(reruns=3)`.
