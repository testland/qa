# CI workflow for the cross-tenant suite

The GitHub Actions job behind Step 3 of the cross-tenant-data-leak-tests
skill: migrations run as the Postgres superuser, the tests run as the
application role.

```yaml
# .github/workflows/tenant-isolation.yml
name: tenant-isolation
on:
  pull_request:
    paths:
      - "**/*.py"
      - "**/migrations/**"
      - ".github/workflows/tenant-isolation.yml"

jobs:
  cross-tenant-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install
        run: pip install -e ".[test]"
      - name: Create non-superuser role
        env:
          PGPASSWORD: ${{ secrets.CI_DB_PASSWORD }}
          APP_DB_PASSWORD: ${{ secrets.CI_APP_DB_PASSWORD }}
        run: |
          psql -h localhost -U postgres -d postgres -c "
            CREATE ROLE app_user LOGIN PASSWORD '$APP_DB_PASSWORD';
          "
      - name: Apply migrations
        env:
          DATABASE_URL: postgresql://postgres:${{ secrets.CI_DB_PASSWORD }}@localhost/test
        run: python manage.py migrate
      - name: Run cross-tenant suite
        env:
          DATABASE_URL: postgresql://app_user:${{ secrets.CI_APP_DB_PASSWORD }}@localhost/test
        run: pytest tests/tenant_isolation/ --tb=short --no-header -v
```

Both DB passwords come from repository secrets, which per the
[GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
are readable in service-container `env` and step `env`. Never write a
literal DB password into the workflow, even for a throwaway CI database.

Key: the **test job connects as `app_user`**, not as the
postgres superuser. The migrations run as superuser; the tests
run as the application role.
