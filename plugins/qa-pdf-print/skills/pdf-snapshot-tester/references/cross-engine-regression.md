# Cross-engine HTML-to-PDF regression

Companion reference for `pdf-snapshot-tester`. Consult when migrating from
one HTML→PDF engine to another (wkhtmltopdf → Chromium, wkhtmltopdf →
WeasyPrint), when shared templates render through more than one engine, or
after an engine version upgrade (Chromium revs change PDF output; WeasyPrint
major versions break layout subtly).

Different engines produce different output for the same input - fonts embed
differently, `@page` support varies, page-break algorithms differ. Tests
verify the chosen engine produces the expected output AND (optionally) that
two engines agree on the critical pages.

## Set up the three engines

**Chromium via Playwright:**

```bash
npm install -D @playwright/test
```

```ts
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(loadInvoiceHTML('inv_001'));
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
await writeFile('out/chromium.pdf', pdf);
```

**WeasyPrint** (per the [WeasyPrint docs]; requires Python 3.10+):

```bash
pip install weasyprint
```

```python
from weasyprint import HTML
HTML(string=html_str, base_url="https://localhost:3000/").write_pdf("out/weasyprint.pdf")
# CLI: weasyprint invoice.html out/weasyprint.pdf
```

**wkhtmltopdf** (no longer actively maintained; verify suitability):

```bash
apt-get install -y wkhtmltopdf
wkhtmltopdf --page-size A4 \
  --margin-top 20mm --margin-right 20mm \
  --margin-bottom 20mm --margin-left 20mm \
  --enable-local-file-access \
  invoice.html out/wkhtmltopdf.pdf
```

## Per-engine baseline assertion

Each engine gets its own baseline set - don't expect engines to be identical
to each other. The pixel-diff mechanics are SKILL.md's job:

```python
import pytest
from pathlib import Path

ENGINES = ["chromium", "weasyprint", "wkhtmltopdf"]

@pytest.mark.parametrize("engine", ENGINES)
def test_invoice_per_engine(engine, tmp_path):
    actual = generate_invoice(engine, "inv_001", tmp_path)
    baseline_dir = Path(f"tests/pdf-baselines/{engine}/inv_001")
    assert_pdf_matches(actual, baseline_dir, threshold=0.005)
```

## Cross-engine agreement test (advisory)

For pages where layout MUST be identical across engines (regulatory filings,
forms with strict positioning), compare extracted positions with tolerance -
never pixel-perfect across engines:

```python
def test_form_field_positions_agree_across_engines():
    chromium_fields = extract_form_fields(generate("chromium"))
    weasyprint_fields = extract_form_fields(generate("weasyprint"))

    for field_name, chrome_pos in chromium_fields.items():
        weasy_pos = weasyprint_fields[field_name]
        # Allow ~2mm tolerance
        assert abs(chrome_pos.x - weasy_pos.x) < 5
        assert abs(chrome_pos.y - weasy_pos.y) < 5
```

## Font embedding verification

```bash
pdfinfo -list-embedded-fonts out/chromium.pdf
```

```python
def test_required_fonts_embedded(engine):
    fonts = list_embedded_fonts(generate("invoice", engine))
    assert "InterVariable" in fonts or any("Inter" in f for f in fonts)
    # System fallbacks indicate a font miss
    assert "Times" not in fonts
    assert "Helvetica" not in fonts
```

## CSS feature support matrix

Capture which @page features each engine handles for your templates
(verify per current engine version - features evolve; per [MDN Paged Media],
"marks" / "bleeds" support is browser-limited):

| Feature | Chromium | WeasyPrint | wkhtmltopdf |
|---|---|---|---|
| `@page :first / :left / :right` | partial | full | none |
| `running()` headers | none | full | none |
| `target-counter()` | none | full | none |
| `bleeds`, `marks` | none | partial | none |

## Engine-version pinning in CI

Engine upgrades change output - pin in CI; bump intentionally with baseline
updates in the same PR:

```yaml
- name: Install WeasyPrint
  run: pip install weasyprint==68.1

- name: Install Playwright (with pinned Chromium)
  run: |
    npm install -D @playwright/test@1.50.0
    npx playwright install --with-deps chromium
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Same baseline for all engines | Output differs per engine | Per-engine baseline sets |
| Skip font-embedding check | OS-default fonts substitute silently | `pdfinfo -list-embedded-fonts` assertion |
| Test only the chosen engine during a migration | Migration sandbagged | Per-engine baselines for both engines |
| Auto-bump engine version in CI | Output silently shifts | Pin versions |
| Compare engines pixel-perfect | They differ naturally; test always fails | Cross-engine = positions + counts with tolerance |

## Limitations

- WeasyPrint is the most CSS-Paged-Media-complete engine; Chromium is the
  most modern-CSS-complete. They have non-overlapping strengths.
- wkhtmltopdf uses an old WebKit fork (~2014); modern CSS features often
  unsupported.
- Headless rendering may not match printer output for proofing; for
  print-critical work, sample a real printer pass.

## References

- [WeasyPrint docs] - Python API, CLI, CSS support
- [MDN Paged Media] - cross-browser @page support notes
- [Playwright page.pdf docs] - Chromium PDF API
- `print-stylesheet-tests` - CSS print-media verification (pre-PDF)

[WeasyPrint docs]: https://doc.courtbouillon.org/weasyprint/stable/
[MDN Paged Media]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media
[Playwright page.pdf docs]: https://playwright.dev/docs/api/class-page#page-pdf
