# Deterministic PDF rendering

Non-deterministic PDF metadata and host font substitution are the two
environment factors that invalidate baselines. Normalize both before
diffing, or rely on image diff (which is metadata-free by construction).

## Strip non-deterministic PDF metadata

PDFs include `/CreationDate`, `/ID`, sometimes `/ModDate`. These change
per run and break byte diffs. Use `qpdf` to normalize:

```bash
qpdf --linearize \
     --object-streams=disable \
     --replace-stream-data=uncompress \
     --remove-attachments \
     out.pdf normalized.pdf
```

Alternative: rely on image diff (render + pixel-diff) which is
metadata-free by construction.

## Font-substitution detection

Missing fonts on the rendering host produce visually-different output.
Detect via Poppler stderr:

```python
import subprocess

result = subprocess.run(
    ["pdfinfo", "-list-embedded-fonts", "out.pdf"],
    capture_output=True, text=True,
)
if "Font Substitution" in result.stderr:
    raise RuntimeError("Font substitution detected; baseline invalid")
```

For CI, install the production font pack via the package manager or
check fonts into the repo for deterministic builds.
