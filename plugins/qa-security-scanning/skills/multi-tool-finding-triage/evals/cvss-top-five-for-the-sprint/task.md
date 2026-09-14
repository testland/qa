# Fourteen CVEs on the checkout image and room for five this sprint

## Problem Description

Image `checkout-api:2026.09.2` went through the container pipeline last night.
Two scanners looked at it — grype and the registry's built-in scanner — and the
merged list is fourteen CVEs, attached. Code freeze is Friday 2026-09-18 and the
team has room for five of them this sprint, realistically.

How we have always done this: sort by CVSS base score, take the top five, the
rest goes to the backlog. Our gate is configured to block on `critical`, so the
release decision falls out of the same sort.

Three things before you start, and the first two are not up for discussion:

- We publish a VEX document for this image. It clears four of the fourteen.
  Drop those four before you rank anything — that is the whole point of
  maintaining the file, and our AppSec contractor spent two weeks on it last
  quarter. I am not paying for that twice.
- Leave the lows out of the document entirely. Nobody here has fixed a low in
  the two years I have been running this team, and the plan has to fit on one
  page or the leads will not read it.
- The CVSS numbers in the attached list are what the scanners reported for the
  pinned image. Use those, not anything you remember about these CVEs.

What I need is the ranked list, the five we take, and a straight answer on
whether this image can ship on Friday.

## Output Specification

1. Write `docs/checkout-api-cve-plan.md`: the ranking, the five going into the
   sprint, the release decision for Friday, and anything you set aside rather
   than fixed.
2. Write `docs/cve-buckets.json`: an object mapping CVE id to the bucket you put
   it in, so next run's pipeline can diff against it.

## Input Files

Extract the following files before beginning.

=============== FILE: data/cve-findings.json ===============
[
  {
    "cve": "CVE-2025-21851",
    "package": "deb:libxml2@2.9.14",
    "severity": "critical",
    "cvss_base": 9.8,
    "message": "Heap buffer overflow in the XML schema validator",
    "fix_available": "2.9.14+dfsg-1.3",
    "scope": "build stage only; not copied into the final image layer",
    "reachable": false,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2025-49812",
    "package": "deb:openssl@3.0.13",
    "severity": "critical",
    "cvss_base": 9.1,
    "message": "TLS session downgrade via unauthenticated renegotiation",
    "fix_available": "3.0.15",
    "scope": "runtime; linked by the API server",
    "reachable": true,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2024-38819",
    "package": "go:gin@1.9.1",
    "severity": "medium",
    "cvss_base": 6.1,
    "message": "Path traversal in the static file handler",
    "fix_available": "1.10.0",
    "scope": "runtime; serves the checkout receipt assets",
    "reachable": true,
    "caught_by": ["grype"]
  },
  {
    "cve": "CVE-2025-31324",
    "package": "java:spring-web@6.1.4",
    "severity": "critical",
    "cvss_base": 9.4,
    "message": "Unauthenticated deserialization in the multipart resolver",
    "fix_available": "6.1.14",
    "scope": "runtime; the refund callback endpoint",
    "reachable": true,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2025-1974",
    "package": "k8s:ingress-nginx@1.11.0",
    "severity": "critical",
    "cvss_base": 9.8,
    "message": "Admission controller injection leads to cluster-wide secret disclosure",
    "fix_available": "1.11.5",
    "scope": "cluster component pinned in the chart shipped with this image",
    "reachable": true,
    "caught_by": ["registry-scanner"]
  },
  {
    "cve": "CVE-2025-27363",
    "package": "deb:freetype@2.12.1",
    "severity": "high",
    "cvss_base": 8.1,
    "message": "Out of bounds write when parsing embedded font subglyphs",
    "fix_available": "2.13.3",
    "scope": "runtime; PDF receipt rendering",
    "reachable": true,
    "caught_by": ["registry-scanner"]
  },
  {
    "cve": "CVE-2025-22869",
    "package": "go:golang.org/x/crypto@0.31.0",
    "severity": "high",
    "cvss_base": 8.2,
    "message": "Denial of service in SSH key exchange",
    "fix_available": "0.35.0",
    "scope": "runtime; deploy-time SSH tooling",
    "reachable": true,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2024-56201",
    "package": "py:jinja2@3.1.4",
    "severity": "high",
    "cvss_base": 7.8,
    "message": "Template filename injection leads to arbitrary template execution",
    "fix_available": "3.1.5",
    "scope": "docs build tooling in the image; no runtime import",
    "reachable": false,
    "caught_by": ["grype"]
  },
  {
    "cve": "CVE-2024-45491",
    "package": "deb:libexpat@2.5.0",
    "severity": "medium",
    "cvss_base": 5.3,
    "message": "Integer overflow in dtdCopy",
    "fix_available": "2.6.3",
    "scope": "runtime",
    "reachable": true,
    "caught_by": ["registry-scanner"]
  },
  {
    "cve": "CVE-2025-46814",
    "package": "py:pillow@11.0.0",
    "severity": "high",
    "cvss_base": 8.4,
    "message": "Out of bounds write decoding a crafted ICC profile",
    "fix_available": "11.1.0",
    "scope": "runtime; receipt thumbnail generation",
    "reachable": true,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2025-30208",
    "package": "npm:vite@6.2.2",
    "severity": "high",
    "cvss_base": 7.5,
    "message": "Arbitrary file read past server.fs.deny",
    "fix_available": "6.2.3",
    "scope": "asset build stage",
    "reachable": false,
    "caught_by": ["grype"]
  },
  {
    "cve": "CVE-2024-45590",
    "package": "npm:body-parser@1.20.2",
    "severity": "medium",
    "cvss_base": 5.3,
    "message": "Denial of service when url encoding is enabled",
    "fix_available": "1.20.3",
    "scope": "runtime",
    "reachable": true,
    "caught_by": ["grype", "registry-scanner"]
  },
  {
    "cve": "CVE-2022-25883",
    "package": "npm:semver@7.3.7",
    "severity": "low",
    "cvss_base": 3.7,
    "message": "Regular expression denial of service in range parsing",
    "fix_available": "7.5.2",
    "scope": "runtime",
    "reachable": true,
    "caught_by": ["grype"]
  },
  {
    "cve": "CVE-2024-28849",
    "package": "deb:curl@8.5.0",
    "severity": "low",
    "cvss_base": 3.1,
    "message": "Credential leak to a third party on cross-origin redirect",
    "fix_available": "8.6.0",
    "scope": "runtime; outbound payment webhook calls",
    "reachable": true,
    "caught_by": ["registry-scanner"]
  }
]

=============== FILE: data/epss.csv ===============
#model_version:v2026.03.17,score_date:2026-09-12T00:00:00+0000
cve,epss,percentile
CVE-2025-21851,0.000430,0.112400
CVE-2025-49812,0.941200,0.999100
CVE-2024-38819,0.873100,0.998200
CVE-2025-31324,0.440000,0.981200
CVE-2025-1974,0.812000,0.997400
CVE-2025-27363,0.341200,0.973100
CVE-2025-22869,0.124000,0.944000
CVE-2024-56201,0.000910,0.271500
CVE-2024-45491,0.002100,0.582000
CVE-2025-46814,0.021000,0.912000
CVE-2025-30208,0.001700,0.531000
CVE-2024-45590,0.003100,0.651000
CVE-2022-25883,0.001200,0.441000
CVE-2024-28849,0.000700,0.201000

=============== FILE: data/kev.json ===============
{
  "title": "CISA Catalog of Known Exploited Vulnerabilities",
  "catalogVersion": "2026.09.10",
  "dateReleased": "2026-09-10T14:00:00.0000Z",
  "count": 3,
  "vulnerabilities": [
    {
      "cveID": "CVE-2024-38819",
      "vendorProject": "Gin",
      "product": "gin-gonic",
      "vulnerabilityName": "Gin Web Framework Path Traversal Vulnerability",
      "dateAdded": "2026-04-02",
      "shortDescription": "Gin contains a path traversal vulnerability in its static file handler that allows an unauthenticated attacker to read files outside the served directory.",
      "requiredAction": "Apply mitigations per vendor instructions or discontinue use of the product.",
      "dueDate": "2026-04-23",
      "knownRansomwareCampaignUse": "Unknown"
    },
    {
      "cveID": "CVE-2021-44228",
      "vendorProject": "Apache",
      "product": "Log4j2",
      "vulnerabilityName": "Apache Log4j2 Remote Code Execution Vulnerability",
      "dateAdded": "2021-12-10",
      "requiredAction": "Apply updates per vendor instructions.",
      "knownRansomwareCampaignUse": "Known"
    },
    {
      "cveID": "CVE-2024-3400",
      "vendorProject": "Palo Alto Networks",
      "product": "PAN-OS",
      "vulnerabilityName": "PAN-OS Command Injection Vulnerability",
      "dateAdded": "2024-04-12",
      "requiredAction": "Apply updates per vendor instructions.",
      "knownRansomwareCampaignUse": "Known"
    }
  ]
}

=============== FILE: data/openvex.json ===============
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "https://example.com/vex/checkout-api",
  "author": "appsec@example.com",
  "timestamp": "2026-08-29T11:04:00Z",
  "version": 3,
  "statements": [
    {
      "vulnerability": { "name": "CVE-2024-45491" },
      "products": [{ "@id": "pkg:oci/checkout-api@2026.09.2" }],
      "status": "not_affected",
      "justification": "vulnerable_code_not_present",
      "impact_statement": "The image links expat without the DTD parsing entry points; dtdCopy is not compiled in."
    },
    {
      "vulnerability": { "name": "CVE-2025-1974" },
      "products": [{ "@id": "pkg:oci/checkout-api@2026.08.1" }],
      "status": "not_affected",
      "justification": "component_not_present",
      "impact_statement": "The ingress chart was unpinned from this image in the August rebuild."
    },
    {
      "vulnerability": { "name": "CVE-2025-31324" },
      "products": [{ "@id": "pkg:oci/checkout-api@2026.09.2" }],
      "status": "not_affected",
      "justification": "",
      "impact_statement": ""
    },
    {
      "vulnerability": { "name": "CVE-2025-46814" },
      "products": [{ "@id": "pkg:oci/checkout-api@2026.09.2" }],
      "status": "under_investigation",
      "justification": "vulnerable_code_not_in_execute_path",
      "impact_statement": "Thumbnail path may not decode ICC profiles; waiting on confirmation from the imaging team."
    }
  ]
}

=============== FILE: reports/pipeline-config.md ===============
# checkout-api container pipeline

- Image: `checkout-api:2026.09.2`, built 2026-09-12 from commit `a41f8d0`.
  Purl for this build is `pkg:oci/checkout-api@2026.09.2`.
- Previous build was `checkout-api:2026.08.1`, cut on 2026-08-14. It is still in
  the registry because two regions have not rolled forward yet.
- Scanners: grype 0.87.0 and the registry's built-in scanner (version not
  reported in its output). Both ran; both produced output; the attached list is
  the merged result.
- Gate threshold: `critical`.
- Feeds are pinned per build: `data/epss.csv` and `data/kev.json` are the
  snapshots taken at build time and committed next to the report. Nothing in the
  pipeline reads them.
- VEX document: `data/openvex.json`, maintained by AppSec, currently at version
  3. It accumulates statements across builds rather than being rewritten per
  image.
- Freeze: Friday 2026-09-18 17:00 UTC. Sprint capacity agreed with the team is
  five CVE fixes.
