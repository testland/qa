---
name: notebook-ci-pipeline-author
description: "Wires the papermill-tests, nbval-tests, and testbook-tests skills into a single working GitHub Actions CI pipeline: parameterized execution (papermill) -> output regression (nbval) -> function unit tests (testbook) -> artifact upload (executed .ipynb + HTML report). Use when a team has notebook tests spread across the three tools but assembles the pipeline manually and needs a single authoritative workflow file with output stripping (nbstripout), pip caching, and structured failure reporting."
type: skill
keywords:
  - notebook-ci
  - papermill
  - nbval
  - testbook
  - github-actions
  - nbstripout
  - jupyter
  - pipeline
---

# notebook-ci-pipeline-author

Composes the three notebook testing tools into one GitHub Actions pipeline:
papermill executes parameterized notebooks, nbval validates output
regression, testbook runs function-level unit tests, and nbstripout
gates committed output. Each tool is documented individually in
`papermill-tests`, `nbval-tests`, and `testbook-tests`; this skill
covers only the wiring and integration decisions.

## When to use

Teams using all three tools but assembling the pipeline by hand:
no consistent artifact naming, no shared caching, duplicate install
steps, no HTML report on failure.

## Hard-reject conditions

Do not proceed if any of the following apply:

- The repository has no `parameters`-tagged notebook cell. Papermill
  injection silently uses notebook defaults when the tag is absent per
  the [Papermill execute docs]; the pipeline will report green against
  stale values.
- nbval ground-truth outputs are absent from the committed `.ipynb`
  files. Re-running cells with no stored outputs produces no diff, so
  regressions are invisible.
- testbook tests use `execute=True` per-function without a
  `scope="module"` fixture. Each test re-executes the kernel; CI
  timeouts follow per the [testbook docs].

State the blocker to the user and stop.

## Step 1 - Install nbstripout as a pre-commit filter

Install once per clone so committed notebooks carry no output noise per
the [nbstripout README]:

```bash
pip install nbstripout
nbstripout --install                    # writes .git/config filter entry
nbstripout --install --attributes .gitattributes  # repo-wide via .gitattributes
```

Add to `.gitattributes`:

```
*.ipynb filter=nbstripout
```

For pull-request verification without modifying files, use the
[kynan/nbstripout action]:

```yaml
- name: Verify notebooks are stripped
  uses: kynan/nbstripout@main
  with:
    paths: '**/*.ipynb'
```

The action runs a dry-run check and fails if any notebook carries
uncommitted output per the [nbstripout README].

## Step 2 - Install dependencies with pip caching

Per [GitHub Actions: Building and Testing Python], the `setup-python`
action accepts `cache: 'pip'` and locates `requirements.txt`
automatically:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: 'pip'

- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install papermill nbval pytest testbook nbconvert
```

Keep `papermill nbval pytest testbook nbconvert` pinned in
`requirements.txt` so the cache key (`hashFiles('**/requirements.txt')`)
reflects version changes.

## Step 3 - Stage 1: papermill parameterized execution

Papermill executes the notebook with injected parameters and writes a
fully-rendered output notebook per the [Papermill execute docs]:

```yaml
- name: Execute notebook (papermill)
  run: |
    papermill notebooks/analysis.ipynb \
      artifacts/analysis-executed.ipynb \
      -p seed 42 \
      -p n_samples 1000
```

Use `-p` for numeric/boolean parameters and `-r` for string parameters
to prevent type-coercion surprises per the [Papermill execute docs].
Store the output path (`artifacts/analysis-executed.ipynb`) in an env
var shared across stages:

```yaml
env:
  EXECUTED_NB: artifacts/analysis-executed.ipynb
```

## Step 4 - Stage 2: nbval output regression

Run nbval in lax mode on the executed notebook. Strict mode fails on
every non-deterministic output; lax mode fails only on errors unless
cells carry `#NBVAL_CHECK_OUTPUT` per the [nbval docs]:

```yaml
- name: Output regression (nbval-lax)
  run: |
    pytest --nbval-lax $EXECUTED_NB \
      --sanitize-with sanitize.cfg \
      -v
```

`sanitize.cfg` example for timestamps and memory addresses per the
[nbval docs]:

```ini
[regex1]
regex: \d{1,2}/\d{1,2}/\d{2,4}
replace: DATE-STAMP

[regex2]
regex: 0x[0-9a-fA-F]+
replace: MEMORY-ADDR
```

Pin per-cell markers on cells that emit timestamps or large floats:
`# NBVAL_IGNORE_OUTPUT`. Use `# NBVAL_RAISES_EXCEPTION` to validate
expected error paths per the [nbval docs].

## Step 5 - Stage 3: testbook function unit tests

Run testbook tests against the source notebook (not the executed
artifact) using a module-scoped fixture so the kernel executes once per
`pytest` session per the [testbook docs]:

```yaml
- name: Unit tests (testbook)
  run: pytest tests/test_notebook_functions.py -v
```

`tests/test_notebook_functions.py` pattern per the [testbook docs]:

```python
import pytest
from testbook import testbook

@pytest.fixture(scope="module")
def tb():
    with testbook("notebooks/analysis.ipynb", execute=True) as tb:
        yield tb

def test_clean_data_drops_nulls(tb):
    clean_data = tb.ref("clean_data")
    result = clean_data(tb.ref("pd").DataFrame({"a": [1, None, 3]}))
    assert len(result) == 2

def test_model_output_shape(tb):
    predict = tb.ref("predict")
    assert predict(tb.ref("test_input")).shape == (1,)
```

## Step 6 - Stage 4: HTML report via nbconvert

Convert the executed notebook to a self-contained HTML report per the
[nbconvert docs]:

```yaml
- name: Convert to HTML
  if: always()
  run: |
    jupyter nbconvert --to html \
      --template lab \
      --embed-images \
      $EXECUTED_NB \
      --output artifacts/analysis-report.html
```

`if: always()` per [GitHub Actions expressions] ensures the report
generates even when nbval or testbook failed; the HTML is the primary
debugging artifact.

## Step 7 - Artifact upload with failure-aware retention

Upload both the executed notebook and the HTML report. Use
`if: always()` so artifacts surface on failure per [GitHub Actions
expressions] and [actions/upload-artifact@v4]:

```yaml
- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: notebook-ci-${{ github.run_id }}
    path: |
      artifacts/analysis-executed.ipynb
      artifacts/analysis-report.html
    if-no-files-found: warn
    retention-days: 14
```

Set `retention-days` within the 1-90 day range allowed by
[actions/upload-artifact@v4]; 14 days covers sprint cycles without
excessive storage.

## Step 8 - Complete workflow

```yaml
name: Notebook CI

on:
  push:
    paths:
      - 'notebooks/**'
      - 'tests/**'
      - 'requirements.txt'
  pull_request:
    paths:
      - 'notebooks/**'

jobs:
  notebook-ci:
    runs-on: ubuntu-latest
    env:
      EXECUTED_NB: artifacts/analysis-executed.ipynb

    steps:
      - uses: actions/checkout@v4

      - name: Verify notebooks are stripped
        uses: kynan/nbstripout@main
        with:
          paths: '**/*.ipynb'

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Execute notebook (papermill)
        run: |
          mkdir -p artifacts
          papermill notebooks/analysis.ipynb \
            $EXECUTED_NB \
            -p seed 42 \
            -p n_samples 1000

      - name: Output regression (nbval-lax)
        run: |
          pytest --nbval-lax $EXECUTED_NB \
            --sanitize-with sanitize.cfg \
            -v

      - name: Unit tests (testbook)
        run: pytest tests/test_notebook_functions.py -v

      - name: Convert to HTML
        if: always()
        run: |
          jupyter nbconvert --to html \
            --template lab \
            --embed-images \
            $EXECUTED_NB \
            --output artifacts/analysis-report.html

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: notebook-ci-${{ github.run_id }}
          path: |
            artifacts/analysis-executed.ipynb
            artifacts/analysis-report.html
          if-no-files-found: warn
          retention-days: 14
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run nbval on the source notebook before papermill | nbval re-executes from scratch; parameter injection never happens | Run nbval on the papermill output notebook (Stage 2) |
| Run testbook tests against the executed artifact | testbook needs the source notebook to resolve cell tags; `.ipynb` with injected-parameters cell confuses selective execution | Point testbook at the source notebook, not the artifact |
| Omit `nbstripout --install` from onboarding | Developers commit outputs; nbval diffs against stale ground truth in CI | Document `nbstripout --install` in `CONTRIBUTING.md`; enforce via the `kynan/nbstripout` action (Step 1) |
| Upload artifacts only on success | Failures produce no HTML; engineers cannot inspect which cell errored | Use `if: always()` on the convert and upload steps (Steps 6-7) |
| Module-scope fixture missing from testbook tests | Each test re-executes the full notebook kernel; multi-minute CI runs per test | Add `@pytest.fixture(scope="module")` (Step 5) |

## Limitations

- Papermill, nbval, and testbook each spawn a separate kernel session.
  For very large notebooks (> 5 min execution), total CI time triples.
  Use selective cell execution in testbook (pass a list of tags to
  `execute`) and split long notebooks into composable units.
- nbval and testbook conflict when run against the same notebook in the
  same pytest session per the [testbook docs]. This workflow avoids
  the conflict by pointing each tool at a different target (nbval on the
  executed artifact, testbook on the source).
- The `kynan/nbstripout` action checks output presence but does not
  enforce kernel metadata stripping; add `--extra-keys` flags locally if
  kernel version metadata causes diff noise.

## References

- [Papermill execute docs] - Python API, CLI flags, parameter types,
  `papermill_description` TQDM integration
- [nbval docs] - strict/lax modes, per-cell markers, sanitize config
- [testbook docs] - `@testbook` decorator, `tb.ref()`, `tb.inject()`,
  `tb.patch()`, module-scoped fixture
- [nbstripout README] - install, git filter, `--install --attributes`,
  `--verify` flag
- [kynan/nbstripout action] - GitHub Actions dry-run check
- [nbconvert docs] - `--to html`, `--template`, `--embed-images` flags
- [GitHub Actions: Building and Testing Python] - `setup-python`
  `cache: 'pip'` pattern
- [actions/upload-artifact@v4] - `name`, `path`, `if-no-files-found`,
  `retention-days` parameters
- [GitHub Actions expressions] - `always()` and `failure()` status
  check functions in step `if` conditions

[Papermill execute docs]: https://papermill.readthedocs.io/en/latest/usage-execute.html
[nbval docs]: https://nbval.readthedocs.io/en/latest/
[testbook docs]: https://testbook.readthedocs.io/
[nbstripout README]: https://github.com/kynan/nbstripout
[kynan/nbstripout action]: https://github.com/kynan/nbstripout
[nbconvert docs]: https://nbconvert.readthedocs.io/en/latest/usage.html
[GitHub Actions: Building and Testing Python]: https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-python
[actions/upload-artifact@v4]: https://github.com/actions/upload-artifact
[GitHub Actions expressions]: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions
