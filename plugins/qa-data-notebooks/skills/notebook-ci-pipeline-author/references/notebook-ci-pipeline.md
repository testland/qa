# notebook-ci-pipeline - reference bundle

Deep detail for `notebook-ci-pipeline-author`: the full assembled GitHub
Actions workflow and the complete testbook test file. The SKILL.md spine
holds the per-stage snippets and integration decisions; this bundle holds
the two longest blocks so the spine stays focused.

## Complete workflow

Steps 1-7 of the skill assemble into one workflow file. Paste this to
`.github/workflows/notebook-ci.yml` and adjust the notebook path, papermill
parameters, and test path to match the repo. Order matters: nbstripout verify
-> pip cache -> papermill -> nbval-lax -> testbook -> nbconvert HTML ->
artifact upload.

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

## Full testbook test file

`tests/test_notebook_functions.py` - the module-scoped fixture executes the
kernel once per pytest session; each test resolves a notebook function with
`tb.ref()` and asserts on its return value:

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
