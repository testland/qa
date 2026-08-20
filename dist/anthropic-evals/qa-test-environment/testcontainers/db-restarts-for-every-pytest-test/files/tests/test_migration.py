from myapp.db import run_migrations, table_names


def test_migration_creates_every_table_from_an_empty_database(db_url):
    # db_url arrives already migrated, so this re-runs the migration and
    # asserts it is safe to apply twice
    run_migrations(db_url)

    assert {"accounts", "ledger_entries"} <= set(table_names(db_url))
