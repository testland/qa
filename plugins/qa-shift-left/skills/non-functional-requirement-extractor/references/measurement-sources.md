# Canonical NFR measurement sources

Each extracted NFR must name **how** it is measured. Look up the canonical
source for its family below. Tool and standard names are load-bearing - the
test report back-references them.

## Performance

| Metric                 | Source                                                              |
|------------------------|---------------------------------------------------------------------|
| LCP (Largest Contentful Paint) | Web Vitals (Google) - page-load perception              |
| INP (Interaction to Next Paint) | Web Vitals - replaces FID since March 2024              |
| CLS (Cumulative Layout Shift)  | Web Vitals                                                  |
| p95 / p99 latency       | k6 / JMeter / Gatling / load-test runner                          |
| Throughput              | Same load-test runners                                              |

Web Vitals canonical thresholds: **LCP ≤2.5s**, **INP ≤200ms**,
**CLS ≤0.1**.

## Accessibility

| Standard           | Source                                                    |
|--------------------|-----------------------------------------------------------|
| WCAG 2.2 AA / AAA  | https://www.w3.org/TR/WCAG22/                              |
| ARIA practices     | https://www.w3.org/WAI/ARIA/apg/                          |
| Tools              | axe-core, pa11y, Lighthouse a11y, IBM Equal Access, WAVE  |

Per-criterion citations use the WCAG SC ID format
(`WCAG 2.2 SC 1.4.3 Contrast (Minimum)`) so the test report
back-references the standard.

## Security

| Standard           | Source                                                    |
|--------------------|-----------------------------------------------------------|
| OWASP Top 10        | https://owasp.org/www-project-top-ten/                   |
| OWASP ASVS         | https://owasp.org/www-project-application-security-verification-standard/ |
| CWE                | https://cwe.mitre.org/                                    |
| Tools              | ZAP / Burp / Snyk / Trivy / Semgrep                        |

## Compatibility

| Source                                        |
|-----------------------------------------------|
| MDN browser-compat-data (https://github.com/mdn/browser-compat-data) |
| Can I use (https://caniuse.com/)              |
| Per-team analytics (real device share)        |

## Reliability

| Concept                         | Source                                              |
|---------------------------------|-----------------------------------------------------|
| SLO / SLA / SLI                  | Google SRE Workbook (free at sre.google/workbook)   |
| Error budgets                   | Same                                                |
| Chaos engineering principles     | https://principlesofchaos.org/                     |

## Internationalization

| Source                                                |
|-------------------------------------------------------|
| W3C i18n Web FAQ (https://www.w3.org/International/)  |
| Unicode CLDR (https://cldr.unicode.org/)              |
| ICU MessageFormat                                     |
