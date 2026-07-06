---
name: pdf-accessibility-checker
description: "Test PDF accessibility (PDF/UA conformance) - tagged-PDF structure (StructTreeRoot), alternative text on images (Alt), reading-order, language metadata (Lang), document title, heading hierarchy. Use veraPDF / PAC (PDF Accessibility Checker) / pdfix / Adobe Acrobat Pro headless; map each finding back to WCAG 2.1 PDF Techniques (PDF1 - PDF23)."
type: skill
keywords:
  - pdf-accessibility
  - pdf-ua
  - tagged-pdf
  - wcag
  - verapdf
---

# pdf-accessibility-checker

Per the [WCAG 2.1 spec], "Text alternatives" + "Structured information
that can be programmatically determined" + "Language identification"
+ "Proper document organization" apply to PDFs. The PDF/UA standard
(ISO 14289) operationalizes these into concrete file-level
requirements: Tagged PDF, role mapping, Alt text, reading order,
Lang metadata.

## When to use

- Producing PDFs in regulated industries (US Section 508, EU
  Directive 2016/2102, accessible-by-default policies).
- Public-sector tenders that require PDF/UA compliance.
- Pre-deployment gate: every customer-facing PDF passes the
  accessibility check before release.

## Step 1 - Pick a checker

| Tool | Strength |
|---|---|
| veraPDF (open source) | PDF/UA-1 + PDF/A validation; CI-friendly CLI |
| PAC (PDF Accessibility Checker) by axes4 | UI-first; comprehensive Matterhorn Protocol coverage |
| pdfix | Commercial; auto-tagging fixes |
| Adobe Acrobat Pro Accessibility Check | Industry default; manual-review-friendly |

For CI, **veraPDF** is the default open-source choice.

## Step 2 - Install veraPDF

```bash
# Download installer
curl -L -o verapdf.zip https://software.verapdf.org/releases/1.27/verapdf-greenfield-1.27.0-installer.zip
unzip verapdf.zip
verapdf-greenfield/verapdf --version
```

(Verify current release at https://verapdf.org for the URL above.)

## Step 3 - Run conformance check

```bash
verapdf --flavour ua1 --format json out.pdf > vera-report.json
```

Exit codes: 0 = conformant, 1 = non-conformant, 2 = parse error.

## Step 4 - Parse and assert

```python
import json, subprocess

def test_pdf_passes_pdf_ua_1():
    result = subprocess.run(
        ["verapdf", "--flavour", "ua1", "--format", "json", "out.pdf"],
        capture_output=True, text=True,
    )
    report = json.loads(result.stdout)

    # Iterate jobs[0].validationResult
    job = report["report"]["jobs"][0]
    failed = job["validationResult"]["details"]["failedRules"]

    assert failed == 0, f"PDF/UA validation failed: {job['validationResult']['details']}"
```

## Step 5 - Verify tagged PDF (StructTreeRoot)

A PDF is "tagged" if its catalog has a `StructTreeRoot` and
`MarkInfo /Marked true`. Without these, screen readers cannot read
the document semantically.

```python
import pikepdf

def test_pdf_is_tagged():
    pdf = pikepdf.open("out.pdf")
    catalog = pdf.Root
    assert "/StructTreeRoot" in catalog, "PDF lacks StructTreeRoot (untagged)"
    mark_info = catalog.get("/MarkInfo", {})
    # Use bool(), not `is True`: pikepdf can return a pikepdf.Object wrapper
    # rather than the singleton Python True, so `is True` is always False
    # even when /Marked is set (per [pikepdf objects]).
    assert bool(mark_info.get("/Marked", False)), "PDF MarkInfo /Marked is false"
```

## Step 6 - Verify document title + language metadata

Per the [WCAG 2.1 spec], language identification + descriptive title
are required.

```python
def test_pdf_has_title_and_lang():
    pdf = pikepdf.open("out.pdf")
    info = pdf.docinfo

    title = info.get("/Title")
    assert title and str(title).strip(), "PDF has no /Info /Title"

    lang = pdf.Root.get("/Lang")
    assert lang and str(lang) in ("en", "en-US", "en-GB", "de", "fr"), f"PDF /Lang invalid: {lang}"
```

## Step 7 - Verify image Alt text presence

```python
def test_all_images_have_alt():
    pdf = pikepdf.open("out.pdf")
    structure_root = pdf.Root["/StructTreeRoot"]

    # The structure tree is NESTED: each element's /K can hold child
    # elements to arbitrary depth, so /Figure tags live below /Document,
    # /Sect, /P, etc. A top-level-only scan misses nested figures and
    # passes vacuously. Walk every /K recursively. Each /Figure must carry
    # an /Alt (or /ActualText) per [WCAG PDF1].
    untagged_images = []

    def walk(node):
        if isinstance(node, pikepdf.Array):
            for child in node:
                walk(child)
            return
        if not isinstance(node, pikepdf.Dictionary):
            return  # marked-content id (int) or other leaf
        if node.get("/S") == "/Figure":
            alt = node.get("/Alt")
            if not alt or not str(alt).strip():
                untagged_images.append(node)
        kids = node.get("/K")
        if kids is not None:
            walk(kids)

    walk(structure_root.get("/K"))
    assert untagged_images == [], f"Images without /Alt: {len(untagged_images)}"
```

## Step 8 - Reading order verification

Reading order determined by structure-tree DFS. Verify the
generated structure puts content in the order a human reader would
expect:

```python
def test_reading_order_matches_visual_order():
    # TEMPLATE: the title and section labels below are placeholders for an
    # invoice layout. Replace them with the expected reading-order landmarks
    # for your own document before using this test.
    text_per_page = extract_text_with_structure_order("out.pdf")

    # First page should start with the document's leading landmark.
    assert text_per_page[0].startswith("Invoice #")  # replace per document
    # Each expected landmark appears on its page, in reading order.
    expected = ["Bill To", "Items", "Total", "Footer"]  # replace per document
    for i, section in enumerate(expected):
        assert section in text_per_page[i] or i == 0
```

This is best done via PAC or visual inspection for high-stakes
documents - automating reading-order verification is hard.

## Step 9 - Map findings to WCAG 2.1 Techniques

Per the [WCAG 2.1 spec], PDF Techniques document specific patterns:

| Technique | What it covers |
|---|---|
| PDF1 | Applying alt text to images |
| PDF2 | Creating bookmarks |
| PDF3 | Ensuring correct tab order |
| PDF4 | Hiding decorative images via Artifact tagging |
| PDF6 | Using table elements (`<Table>` / `<TR>` / `<TH>` / `<TD>`) |
| PDF9 | Heading structure (H1 / H2 / H3) |
| PDF15 | Form field accessibility |
| PDF18 | Document title in DocInfo |
| PDF19 | Lang in document or per-element |

When a check fails, cite the technique in the failure message:

```python
assert title, "PDF18: Document title required (WCAG 2.1)"
```

## Step 10 - CI gate

```yaml
- name: PDF/UA conformance
  run: |
    for pdf in out/*.pdf; do
      # jq -e sets the exit status from the result: false/null gives exit 1,
      # so the gate actually fails on violations. Plain jq exits 0 regardless
      # of the printed boolean (per [jq manual]), so `|| exit 1` never fired.
      verapdf --flavour ua1 --format json "$pdf" \
        | jq -e '.report.jobs[0].validationResult.details.failedRules == 0' > /dev/null || exit 1
    done
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generate PDF with `printBackground: true` and skip tag check | Visually fine; screen-reader-broken | veraPDF flavour ua1 (Step 3) |
| Convert via tools that strip tags (some HTML→PDF engines) | Pre-tag stripped during convert | Use tagged-PDF-capable engines (WeasyPrint with tagged-pdf option) |
| Skip /Lang | Screen readers use wrong pronunciation | Step 6 |
| Auto-generate Alt = filename | "logo.png" doesn't help screen reader | Manual Alt review for high-stakes |
| Only run in pre-prod, not CI | Inaccessible PDFs ship | Block PR (Step 10) |

## Limitations

- veraPDF/UA1 catches structural issues; semantic correctness
  (helpful Alt text vs filename Alt) needs human review.
- PAC is more complete than veraPDF for the Matterhorn Protocol but
  GUI-only.
- WeasyPrint produces tagged PDFs; older versions of wkhtmltopdf
  do not. Check engine output capabilities.
- WCAG 2.1 PDF Techniques are non-normative; consult the [WCAG 2.1
  spec] + the per-technique test pages for current guidance.

## References

- [WCAG 2.1 spec] - accessibility principles applicable to PDFs
- veraPDF (PDF/UA-1 + PDF/A validator) - verapdf.org
- PAC by axes4 - pac.pdf-accessibility.org (Matterhorn Protocol)
- ISO 14289-1 (PDF/UA-1) - cite by stable ID; consult ISO for spec text
- pikepdf Python library - pikepdf.readthedocs.io
- [pikepdf objects] - how pikepdf maps PDF scalars to Python types
- [WCAG PDF1] - applying /Alt text to /Figure structure elements
- [jq manual] - the `-e` / `--exit-status` flag for CI gating
- [`pdf-snapshot-tester`](../pdf-snapshot-tester/SKILL.md) - sister
  skill for visual-regression on the same PDFs

[WCAG 2.1 spec]: https://www.w3.org/TR/WCAG21/
[pikepdf objects]: https://pikepdf.readthedocs.io/en/stable/topics/objects.html
[WCAG PDF1]: https://www.w3.org/TR/WCAG20-TECHS/PDF1.html
[jq manual]: https://jqlang.org/manual/
