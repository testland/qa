# qa-pdf-print-render

Print + PDF rendering testing - closes the gap left by
`qa-visual-regression` (which covers screen output but not
print/PDF). Critical for invoices, contracts, statements,
regulatory filings.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [pdf-snapshot-tester](skills/pdf-snapshot-tester/SKILL.md) | S1 | Per-page render via `pdftocairo` / pdf2image; pixel-diff via Pillow / pixelmatch; page-range targeting; font-substitution detection; UPDATE_PDF_BASELINES workflow |
| Skill | [print-stylesheet-tests](skills/print-stylesheet-tests/SKILL.md) | S1 | Playwright `emulateMedia({ media: 'print' })` + `page.pdf()`; `@page` size + margin tests; `printBackground` + `preferCSSPageSize`; page-count regression tests |
| Skill | [html-to-pdf-regression](skills/html-to-pdf-regression/SKILL.md) | S1 | Cross-engine HTML→PDF (Chromium / WeasyPrint / wkhtmltopdf); per-engine baseline; font-embedding verification; engine-version pinning |
| Skill | [pdf-accessibility-checker](skills/pdf-accessibility-checker/SKILL.md) | S1 | PDF/UA-1 (ISO 14289) conformance via veraPDF; Tagged PDF + StructTreeRoot + MarkInfo /Marked; Alt text + /Lang + /Title; WCAG 2.1 PDF technique mapping |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-pdf-print-render@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
