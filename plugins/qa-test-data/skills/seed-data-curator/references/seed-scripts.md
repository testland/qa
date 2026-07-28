# Seed bootstrap wiring

The seed runs the same factory script in every environment; only the
surrounding orchestration differs. Keep the seed command a single
named target (`make seed`) and call it from each environment.

## CI

```yaml
# .github/workflows/e2e.yml (excerpt)
- name: Set up DB
  run: |
    bundle exec rake db:test:reset
    bundle exec ruby scripts/seed.rb

- name: Run E2E tests
  run: bundle exec rspec spec/system
```

Reset between test suites - never share state across suites unless
the team explicitly designed for it (and accepted the flake risk;
see `flake-pattern-reference` Pattern 2).

## Ephemeral env (Docker Compose)

```yaml
# docker-compose.test.yml (excerpt)
services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy
    command: |
      sh -c "
        rake db:migrate &&
        ruby scripts/seed.rb &&
        bundle exec rspec
      "
```
