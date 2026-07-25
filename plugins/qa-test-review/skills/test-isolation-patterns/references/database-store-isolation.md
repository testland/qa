# Database and external-store isolation

Deep reference for `test-isolation-patterns` SKILL.md. Consult after picking fixture scope, when the system under test reads or writes a database, cache, or queue. This is the dominant source of test flake at scale; five canonical strategies, each with trade-offs.

## Transaction-rollback (the default)

Each test runs in a transaction; teardown rollbacks. Works for: relational DBs with full transaction support. Doesn't work for: DDL changes, multiple DB connections, queues, caches.

## Database-per-test-worker

Each parallel worker gets its own database (named `app_test_worker_1`, `app_test_worker_2`, etc.). Created once at startup; reused across tests within the worker; dropped at suite end. Works for: parallel execution with mutation-heavy tests. Cost: pre-suite setup time + N× DB storage.

## Template database / pristine clone

Pre-create a template database with seed data; clone it per test (or per worker). PostgreSQL's `CREATE DATABASE … TEMPLATE template_db` is the canonical mechanism. Works for: tests needing complex seed state. Cost: template maintenance.

## Containerised DB-per-test

Each test gets a fresh Docker container ([Testcontainers](https://testcontainers.com/) is the canonical library). Maximum isolation; highest cost. Works for: integration tests where the DB version / extensions / config matter. Don't use for: unit tests.

## In-memory substitution

Use SQLite in-memory instead of the production DB engine. Fast; works for simple SQL. Doesn't work for: production-specific features (PostgreSQL JSON, Postgres extensions, MySQL spatial types). Cited as an anti-pattern by [Fowler on integration tests](https://martinfowler.com/articles/practical-test-pyramid.html) when the production engine has features the in-memory substitute lacks.

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Tests that mutate a shared DB without isolation | Cross-test coupling; the dominant source of flake at scale |
| In-memory substitution masking production-engine differences | Tests pass locally; fail in production |
| Transaction-rollback for tests that do DDL (CREATE TABLE in test) | DDL is auto-commit in most engines; rollback doesn't undo it |
| Database-per-worker without a maximum-worker limit | Storage explodes; CI cost surges |
| Containerised DB-per-test for unit tests | 5-second container startup × 1000 unit tests = unworkable |
