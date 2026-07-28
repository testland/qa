# Langfuse datasets for offline eval

Langfuse datasets are collections of `(input, expected_output)` items.
Build them from three sources:

- **Production traces**: promote real traces into a dataset for
  regression coverage. Sanitize PII before promotion - cross-ref
  `synthetic-pii-generator`.
- **CSV / JSONL import**: load a curated fixture set.
- **UI**: hand-author items.

Shipping traces from production into a dataset, then replaying them, is
the core offline-regression workflow: `item.run()` links each replay
back to the dataset so the Langfuse UI can diff the run against a
baseline. See [langfuse.com/docs/datasets](https://langfuse.com/docs/datasets)
for the current API signature.

## Validation

After running a dataset, open the Langfuse UI → Datasets → select your
dataset. Each item run should appear under the Runs tab linked to its
trace. If runs are missing, confirm `dataset_id` is correct and that
`item.run()` did not raise an exception.
