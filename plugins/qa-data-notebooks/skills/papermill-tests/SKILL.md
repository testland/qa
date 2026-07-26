---
name: papermill-tests
description: "Use Papermill to parameterize and execute notebooks in CI as regression tests - `papermill input.ipynb output.ipynb -p alpha 0.6` (CLI) or `pm.execute_notebook(...)` (Python API). Use when notebooks must run as parameterized regression jobs in CI."
metadata:
  keywords: "papermill, jupyter, notebook-testing, parameterized-execution, regression-testing"
---

# papermill-tests

Papermill executes notebooks programmatically with injected
parameters, producing an output notebook with results. Per the
[Papermill execute docs], it pairs naturally with regression testing:
run a parameterized notebook in CI, assert on outputs.

## When to use

- Parameterized analysis notebooks: same notebook, different inputs
  (per-region, per-month, per-customer-segment).
- Production-grade notebook execution (Airflow / Argo / Prefect /
  cron) - papermill is the standard executor.
- Regression test: re-run the notebook with known inputs; assert
  output values match expected (often paired with nbval/testbook).

## How to use

1. `pip install papermill` (Step 1).
2. Tag one notebook cell `parameters` with default values (Step 2).
3. Execute with injected inputs via the Python API `pm.execute_notebook(...)` or the CLI `papermill in.ipynb out.ipynb -p NAME VAL` (Steps 3-4).
4. Read the output notebook with `nbformat` and assert on the final cell's values inside a pytest test (Step 5).
5. Always seed stochastic parameters (`-p seed N`) so reruns are reproducible.
6. Upload the output notebook as a CI artifact so failed assertions stay inspectable (Step 6).
7. Layer nbval / testbook on top of papermill's execution for output and function-level assertions (Step 7).

## Step 1 - Install

```bash
pip install papermill
```

Per the [Papermill execute docs].

## Step 2 - Tag the parameters cell

In your notebook, tag one cell with `parameters`:

```python
# Cell tagged "parameters"
alpha = 0.5
ratio = 0.2
input_path = "data/sales.parquet"
```

Papermill replaces these with injected values at execution time
(adds an `injected-parameters` cell after the tagged cell).

## Step 3 - Python API execution

```python
import papermill as pm

pm.execute_notebook(
    'path/to/input.ipynb',
    'path/to/output.ipynb',
    parameters=dict(alpha=0.6, ratio=0.1)
)
```

Per the [Papermill execute docs].

## Step 4 - CLI execution

```bash
# Local in/out
papermill local/input.ipynb local/output.ipynb -p alpha 0.6 -p ratio 0.1

# S3 output
papermill local/input.ipynb s3://bkt/output.ipynb -p alpha 0.6 -p l1_ratio 0.1
```

Parameter flags per the [Papermill execute docs]:

| Flag | Meaning |
|---|---|
| `-p NAME VAL` | Simple parameter (auto-typed) |
| `-r NAME VAL` | Raw string (preserve as string) |
| `-f file.yaml` | Parameters from YAML file |
| `-y "key: val"` | Inline YAML (supports lists, dicts) |
| `-b base64yaml` | Base64-encoded YAML |

## Step 5 - Use as regression test

```python
import json
import papermill as pm
import nbformat

def test_analysis_with_known_inputs(tmp_path):
    out_path = tmp_path / "out.ipynb"
    pm.execute_notebook(
        'analysis.ipynb',
        str(out_path),
        parameters=dict(seed=42, n_samples=1000),
    )

    nb = nbformat.read(str(out_path), as_version=4)
    final_cell = nb.cells[-1]
    output_text = final_cell.outputs[0]['text']
    result = json.loads(output_text)

    assert abs(result['mean'] - 0.5) < 0.01
    assert result['n'] == 1000
```

The output notebook is artifact-friendly - attach to CI runs for
review when assertions fail.

## Step 6 - Parameter sweeps in CI

```yaml
# GitHub Actions matrix sweep
strategy:
  matrix:
    seed: [42, 123, 7]
    n_samples: [100, 1000]
steps:
  - run: |
      papermill analysis.ipynb out-${{ matrix.seed }}-${{ matrix.n_samples }}.ipynb \
        -p seed ${{ matrix.seed }} \
        -p n_samples ${{ matrix.n_samples }}
  - uses: actions/upload-artifact@v4
    with:
      name: papermill-output-${{ matrix.seed }}-${{ matrix.n_samples }}
      path: out-${{ matrix.seed }}-${{ matrix.n_samples }}.ipynb
```

## Step 7 - Pair with nbval / testbook

| Tool | Strength | Pair with papermill how |
|---|---|---|
| nbval | Full-notebook output regression | Run papermill first (parameter inject) → run nbval on output |
| testbook | Function-level unit tests | testbook can use papermill's executor under the hood - see testbook configuration for `execute_kwargs` |

Papermill is the engine; nbval and testbook are the assertion
layers. Use all three for production notebook QA.

## Step 8 - TQDM progress descriptions

Add comments at cell start:

```python
#papermill_description=load_data
df = load_dataset()

#papermill_description=train_model
model.fit(df)
```

Per the [Papermill execute docs]: integrates with TQDM for
meaningful CI progress indicators.

## Worked example

An analyst ships `analysis.ipynb` that samples a distribution and
prints a JSON summary in its last cell. To gate it in CI:

1. Tag the top cell `parameters` with defaults `seed = 0` and
   `n_samples = 100`.
2. Add a pytest test that runs
   `pm.execute_notebook('analysis.ipynb', out_path, parameters=dict(seed=42, n_samples=1000))`.
3. Read `out.ipynb` with `nbformat`, parse the last cell's output
   text as JSON, and assert `abs(result['mean'] - 0.5) < 0.01` and
   `result['n'] == 1000`.

On a green run the assertions pass and `out.ipynb` uploads as a CI
artifact. When a refactor shifts the sampled mean, the assertion
fails, the job goes red, and the attached output notebook shows the
offending cell for review.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget the `parameters` cell tag | Parameters never inject; notebook runs with defaults | Tag the cell explicitly (Step 2) |
| Mix `-p` and `-r` types incorrectly | `-p version 1.0` becomes float 1.0; loses leading zeros etc. | Use `-r` for strings (Step 4) |
| Run papermill against side-effect notebooks (writes to prod DB) | Papermill is non-transactional; partial failures leave bad state | Use ephemeral workdirs / staging credentials in test runs |
| Ignore the output notebook (only check exit code) | Subtle errors visible only in cell outputs | Save + inspect output notebook (Step 5); upload as artifact (Step 6) |
| Skip seed parameterization | Tests flake on stochastic models | Always `-p seed N` for reproducible runs |

## Limitations

- Papermill executes via the standard Jupyter kernel; very long
  notebooks have higher OOM risk than equivalent `.py` scripts.
- Output notebooks are large (full re-render of all cells); CI
  artifact storage adds up - consider retention policy.
- Parameter injection is one-shot at notebook start; cannot
  re-parameterize mid-run.

## References

- [Papermill execute docs] - Python API, CLI, parameter flags,
  TQDM integration

[Papermill execute docs]: https://papermill.readthedocs.io/en/latest/usage-execute.html
