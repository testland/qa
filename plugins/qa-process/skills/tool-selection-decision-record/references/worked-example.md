# Worked example - tool-selection decision record

Deep reference for the `tool-selection-decision-record` SKILL.md. A filled record using the Template in the spine. Note at the end what the record deliberately does NOT contain.

A billing service needs a database migration tool. The analysis has already
happened; this is the record it produces.

```markdown
# 0007 - Database migration tool for the billing service

**Status:** accepted 2026-07-19

**Signal:**
services/billing/pyproject.toml:14
> django = "^5.2"

services/billing/billing/migrations/0001_initial.py exists and is tracked.

**Decision:** We will use Django's built-in migrations.

**Rationale:**
- Fits because: the service's schema is already defined as Django ORM models,
  and Django ships a migrations system that propagates model changes into the
  database schema via `makemigrations` and `migrate`, storing migration files
  in a `migrations` directory inside each app
  (https://docs.djangoproject.com/en/5.2/topics/migrations/). The tracked
  `0001_initial.py` shows that history has already started here.
- Not Alembic, because: Alembic is "a lightweight database migration tool for
  usage with the SQLAlchemy Database Toolkit for Python"
  (https://alembic.sqlalchemy.org/en/latest/). Adopting it would mean
  maintaining a second schema definition alongside the Django models, and
  abandoning the migration history already committed.

**Secondary fallback:** none. The two candidates are not co-equal: the ORM in
the signal selects one of them outright.

**Read next:** the Django migrations topic guide
(https://docs.djangoproject.com/en/5.2/topics/migrations/), specifically the
sections on dependencies between app migrations and on squashing.

**Flip conditions:**
- The billing service moves off the Django ORM to SQLAlchemy.
- A second, non-Django service needs to share this migration history.
- The team adopts a database engine with no supported Django backend.
```

Note what the record does not contain: no scoring table, no third candidate, no
paragraph about either tool's community size. Everything in it is either quoted
from the project or cited to a document the reader can open.
