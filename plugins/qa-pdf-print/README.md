# qa-pdf-print

Print + PDF rendering testing - closes the gap left by
`qa-visual-regression` (which covers screen output but not
print/PDF). Critical for invoices, contracts, statements,
regulatory filings.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [pdf-snapshot-tester](skills/pdf-snapshot-tester/SKILL.md) | Per-page render via `pdftocairo` / pdf2image; pixel-diff via Pillow / pixelmatch; page-range targeting; font-substitution detection; UPDATE_PDF_BASELINES workflow; cross-engine HTML→PDF regression (Chromium / WeasyPrint / wkhtmltopdf) in references/ |
| Skill | [print-stylesheet-tests](skills/print-stylesheet-tests/SKILL.md) | Playwright `emulateMedia({ media: 'print' })` + `page.pdf()`; `@page` size + margin tests; `printBackground` + `preferCSSPageSize`; page-count regression tests |
| Skill | [pdf-accessibility-checker](skills/pdf-accessibility-checker/SKILL.md) | PDF/UA-1 (ISO 14289) conformance via veraPDF; Tagged PDF + StructTreeRoot + MarkInfo /Marked; Alt text + /Lang + /Title; WCAG 2.1 PDF technique mapping |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pdf-print@testland-qa
```
