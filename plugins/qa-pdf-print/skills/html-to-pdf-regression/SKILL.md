---
name: html-to-pdf-regression
description: "Cross-engine HTML→PDF regression - generate the same source HTML through Chromium `page.pdf()`, WeasyPrint (Python, BSD), and wkhtmltopdf, then compare per-engine outputs page-by-page. Catches engine-specific font embedding bugs, page-break drift, @page rule support gaps. Pair with pdf-snapshot-tester for the per-engine pixel diff. Use when a project is swapping or upgrading its PDF engine, or when one shared HTML template is rendered by more than one engine and the outputs must stay equivalent."
metadata:
  keywords: "html-to-pdf, weasyprint, wkhtmltopdf, chromium-pdf, cross-engine"
---

# html-to-pdf-regression

Different HTML→PDF engines produce different output for the same
input - fonts embed differently, `@page` support varies, page-break
algorithms differ. Tests verify the chosen engine produces the
expected output AND (optionally) that two engines agree on the
critical pages.

## When to use

- Migrating from one engine to another (wkhtmltopdf → Chromium,
  wkhtmltopdf → WeasyPrint).
- Multi-engine production (different products use different engines;
  templates shared).
- Regression after engine version upgrade (Chromium revs change PDF
  output; WeasyPrint major versions break layout subtly).

## Step 1 - Set up the three engines

**Chromium via Playwright:**

```bash
npm install -D @playwright/test
```

**WeasyPrint:**

Per the [WeasyPrint docs]:

```bash
pip install weasyprint
# OR CLI: weasyprint input.html output.pdf
```

Requires Python 3.10+ per the [WeasyPrint docs].

**wkhtmltopdf:**

```bash
# OS package or download from wkhtmltopdf.org
apt-get install -y wkhtmltopdf
```

(Note: wkhtmltopdf is no longer actively maintained; verify
suitability for your stack.)

## Step 2 - Generate via Chromium

```ts
import { test, chromium } from '@playwright/test';
import { writeFile } from 'fs/promises';

test('generate via Chromium', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(loadInvoiceHTML('inv_001'));
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await writeFile('out/chromium.pdf', pdf);
  await browser.close();
});
```

## Step 3 - Generate via WeasyPrint

Per the [WeasyPrint docs] Python API:

```python
from weasyprint import HTML

html_str = load_invoice_html("inv_001")
HTML(string=html_str, base_url="https://localhost:3000/").write_pdf("out/weasyprint.pdf")
```

CLI alternative:

```bash
weasyprint invoice.html out/weasyprint.pdf
```

## Step 4 - Generate via wkhtmltopdf

```bash
wkhtmltopdf \
  --page-size A4 \
  --margin-top 20mm --margin-right 20mm \
  --margin-bottom 20mm --margin-left 20mm \
  --enable-local-file-access \
  invoice.html out/wkhtmltopdf.pdf
```

## Step 5 - Per-engine baseline assertion

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

Each engine has its own baseline set. Don't expect them to be
identical to each other.

## Step 6 - Cross-engine agreement test (advisory)

For pages where layout MUST be identical across engines (regulatory
filings, forms with strict positioning):

```python
def test_form_field_positions_agree_across_engines():
    chromium_pdf = generate("chromium")
    weasyprint_pdf = generate("weasyprint")

    chromium_fields = extract_form_fields(chromium_pdf)
    weasyprint_fields = extract_form_fields(weasyprint_pdf)

    for field_name, chrome_pos in chromium_fields.items():
        weasy_pos = weasyprint_fields[field_name]
        # Allow ±2mm tolerance
        assert abs(chrome_pos.x - weasy_pos.x) < 5
        assert abs(chrome_pos.y - weasy_pos.y) < 5
```

## Step 7 - Font embedding verification

```bash
pdfinfo -list-embedded-fonts out/chromium.pdf
pdfinfo -list-embedded-fonts out/weasyprint.pdf
```

```python
def test_required_fonts_embedded(engine):
    actual = generate("invoice", engine)
    fonts = list_embedded_fonts(actual)

    # Production fonts must be embedded
    assert "InterVariable" in fonts or any("Inter" in f for f in fonts)
    # System fallbacks indicate font miss
    assert "Times" not in fonts
    assert "Helvetica" not in fonts
```

## Step 8 - CSS feature support matrix

Capture which @page features each engine handles for your templates:

| Feature | Chromium | WeasyPrint | wkhtmltopdf |
|---|---|---|---|
| `@page :first / :left / :right` | partial | full | none |
| `running()` headers | none | full | none |
| `target-counter()` | none | full | none |
| `bleeds`, `marks` | none | partial | none |

(Verify per current engine version - features evolve. Per [MDN Paged
Media], "marks" / "bleeds" support is browser-limited.)

## Step 9 - Engine-version pinning in CI

```yaml
- name: Install WeasyPrint
  run: pip install weasyprint==68.1

- name: Install Playwright (with pinned Chromium)
  run: |
    npm install -D @playwright/test@1.50.0
    npx playwright install --with-deps chromium
```

Engine upgrades change output - pin in CI; bump intentionally with
baseline updates in same PR.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Same baseline for all engines | Output differs per engine | Per-engine baseline (Step 5) |
| Skip font-embedding check | OS-default fonts substitute silently | Step 7 |
| Test only the chosen engine | Migration sandbagged | Cross-engine baseline (Step 5) |
| Auto-bump engine version in CI | Output silently shifts | Pin (Step 9) |
| Compare engines pixel-perfect | Differs naturally; test fails | Cross-engine = positions + counts (Step 6) |

## Limitations

- WeasyPrint is the most CSS-Paged-Media-complete engine; Chromium
  is the most modern-CSS-complete. They have non-overlapping
  strengths.
- wkhtmltopdf uses an old WebKit fork (~2014); modern CSS features
  often unsupported.
- Headless rendering may not match printer output for proofing; for
  print-critical work, sample a real printer pass.

## References

- [WeasyPrint docs] - Python API, CLI, CSS support
- [MDN Paged Media] - cross-browser @page support notes
- [Playwright page.pdf docs] - Chromium PDF API
- `pdf-snapshot-tester` - sister
  skill for per-engine pixel-diff assertions
- `print-stylesheet-tests` - 
  CSS print-media verification (pre-PDF)

[WeasyPrint docs]: https://doc.courtbouillon.org/weasyprint/stable/
[MDN Paged Media]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media
[Playwright page.pdf docs]: https://playwright.dev/docs/api/class-page#page-pdf
