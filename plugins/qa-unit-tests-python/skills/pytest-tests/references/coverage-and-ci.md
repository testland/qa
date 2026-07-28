# pytest coverage config and CI integration

Deeper coverage configuration and CI wiring for pytest. The SKILL.md spine
keeps the minimal `pytest --cov ... --cov-fail-under=80` command; the
exhaustive config and pipeline wiring live here.

## Coverage config (pyproject.toml)

```toml
[tool.coverage.run]
source = ["src"]
branch = true
omit = ["**/__init__.py", "**/types.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
fail_under = 80
```

`branch = true` enables branch coverage (not just line coverage).
`exclude_lines` drops lines that can never meaningfully be covered from the
denominator. `fail_under` mirrors the `--cov-fail-under` flag as a config
default.

## CI integration (GitHub Actions)

```yaml
- run: pip install -e .[dev]
- run: pytest --cov --cov-report=xml --cov-fail-under=80 --junitxml=junit.xml
- uses: codecov/codecov-action@v4
  with: { files: coverage.xml }
```

`--junitxml=junit.xml` emits a JUnit report for CI test-result annotations;
`--cov-report=xml` emits `coverage.xml` for the coverage uploader.

## Parallel execution (pytest-xdist)

```bash
pytest -n auto   # uses CPU count
```

`pytest-xdist` distributes tests across worker processes. Combine with
coverage via `--cov` (pytest-cov merges per-worker data automatically).
