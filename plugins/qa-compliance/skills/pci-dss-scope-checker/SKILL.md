---
name: pci-dss-scope-checker
description: "Build-an-X for PCI DSS v4.0 scope verification — cardholder data environment (CDE) boundary tests, segmentation tests (PCI Req 1), prohibited-data-storage assertions per Req 3 (no full track data, no CVV/CAV2/CVC2/CID, no PIN/PIN block post-authorization), key-management tests per Req 3.6, encryption-of-transmissions per Req 4. Use when authoring PCI DSS scope-reduction + control tests for any system handling payment-card data."
rating: 23
d6: 4
archetype: S3
---

# pci-dss-scope-checker

## Overview

PCI DSS (Payment Card Industry Data Security Standard) v4.0 (in
force March 2024, fully required March 2025) applies to any system
that "stores, processes, or transmits cardholder data" or impacts
the security of such systems.

Per [pcisecuritystandards.org][pci]:

[pci]: https://www.pcisecuritystandards.org/

The 12 high-level requirements:

1. Install + maintain network security controls
2. Apply secure configurations to all system components
3. Protect stored account data
4. Protect cardholder data with strong cryptography during transmission
5. Protect all systems + networks from malicious software
6. Develop + maintain secure systems + software
7. Restrict access to system components by business need to know
8. Identify users + authenticate access
9. Restrict physical access
10. Log + monitor all access
11. Test security of systems + networks regularly
12. Support information security with org policies + programs

This is a **build-an-X workflow** (S3) — the workflow for verifying
your CDE scope is correctly bounded + the prohibited-data
assertions in fixtures.

## When to use

- The product processes payment cards (subject to PCI DSS).
- Scope-reduction effort underway: confirming which systems are
  in/out of CDE.
- BAU verification: prohibited data storage doesn't slip in via
  schema changes / log additions.
- Pre-QSA-audit: dry run of evidence collection.

## Cardholder Data (CHD) vs Sensitive Authentication Data (SAD)

Per PCI DSS v4.0:

| Category | Examples | Storage allowed? |
|---|---|---|
| **CHD — Account Data** | Primary Account Number (PAN) | Yes, but encrypted |
| **CHD — Account Data** | Cardholder name | Yes |
| **CHD — Account Data** | Service code | Yes |
| **CHD — Account Data** | Expiration date | Yes |
| **SAD — Sensitive Auth Data** | Full track data (Track 1 + Track 2) | **NEVER store post-authorization** |
| **SAD** | CVV2 / CVC2 / CID (3-4 digit security codes) | **NEVER store post-authorization** |
| **SAD** | PIN / PIN block | **NEVER store post-authorization** |

The "post-authorization" rule is critical: SAD may transit during
the auth flow, but storage after auth completes (logs, DB, audit
trails, backup) is forbidden.

## Step 1 — Define + assert CDE boundary

```python
# pci_scope.py
CDE_SYSTEMS = {
    'payment-service',
    'tokenization-service',
    'card-vault-db',
    'pci-zone-fw',
}
NON_CDE_SYSTEMS = {
    'web-frontend',     # tokens only; no raw PAN
    'analytics',         # never sees PAN
    'support-tickets',   # never sees PAN
}

def test_cde_systems_isolated_from_non_cde():
    for cde_system in CDE_SYSTEMS:
        for non_cde in NON_CDE_SYSTEMS:
            # Network policy MUST block direct connections from non-CDE to CDE
            allowed = network_policy.get_allowed_connections(cde_system, non_cde)
            # Only via tokenization gateway (via PCI zone FW)
            assert allowed == [] or allowed == ['via-pci-zone-fw']
```

Segmentation testing per PCI DSS Req 11.4.1 must be performed at
least every 6 months by a qualified internal resource OR external
penetration tester.

## Step 2 — Assert no SAD storage post-authorization (Req 3.2)

```python
import re

def test_no_full_track_data_in_storage():
    """Req 3.2.1: track data must not be retained post-authorization."""
    track_pattern = re.compile(r'%[A-Z]\d{12,19}\^[^\?]*\?\d*\?')   # Track 1
    db_dump = export_database()
    for table in db_dump.tables:
        for row in table:
            for value in row.values():
                assert not track_pattern.search(str(value)), f"Full track data in {table.name}"

def test_no_cvv_in_logs():
    """Req 3.2.2: CVV2/CVC2/CID must not be retained."""
    cvv_pattern = re.compile(r'(?<!\d)\d{3,4}(?!\d)')   # naive — context-aware in real life
    log_entries = recent_logs()
    for entry in log_entries:
        # Look for proximity of CVV-like 3-4 digit numbers near "cvv" / "card" tokens
        if 'cvv' in entry.text.lower() or 'card' in entry.text.lower():
            matches = cvv_pattern.findall(entry.text)
            for m in matches:
                assert m == '***' or m == '----', f"Possible CVV in log: {entry.id}"
```

## Step 3 — Assert PAN encryption at rest (Req 3.4)

```python
def test_pan_stored_encrypted():
    """Req 3.4: PAN unreadable wherever stored (encryption / truncation / hashing / tokenization)."""
    # Pull a sample card record
    card_record = CardVault.objects.first()
    raw_pan = card_record._raw_pan_field    # accessor for storage-format field

    # Format MUST be one of:
    #  - encrypted (AES-256 or stronger)
    #  - truncated (e.g., last 4 only)
    #  - hashed (with salt; one-way)
    #  - tokenized (replaced with non-sensitive token)
    valid_format = (
        is_encrypted_aes_256(raw_pan)
        or is_truncated_last_4(raw_pan)
        or is_hashed_with_salt(raw_pan)
        or is_tokenized(raw_pan)
    )
    assert valid_format, f"PAN stored unprotected: {redact(raw_pan)}"

def test_decryption_keys_not_in_app_repo():
    """Req 3.6: cryptographic keys protected against unauthorized access."""
    # Search repo for accidental key inclusion
    repo_files = scan_repo_files()
    for f in repo_files:
        content = read_file(f)
        # No hardcoded AES keys (high entropy + length 256+ bits)
        assert not re.search(r'AES_KEY\s*=\s*["\'][A-Za-z0-9+/=]{40,}', content)
        # No KMS key file references
        assert 'kms-private-key.pem' not in f
```

## Step 4 — Encryption of transmissions (Req 4)

```python
def test_pan_only_transmitted_via_strong_crypto():
    """Req 4.2.1: strong crypto for transmission of cardholder data over open networks."""
    # All endpoints handling PAN must require TLS 1.2+
    for endpoint in CDE_API_ENDPOINTS:
        tls_info = inspect_tls(endpoint)
        assert tls_info.protocol >= 'TLSv1.2'
        # Reject weak ciphers
        assert tls_info.cipher_strength >= 256
        # Reject deprecated suites
        assert tls_info.cipher not in DEPRECATED_CIPHERS
```

## Step 5 — Access control (Req 7 + 8)

```python
def test_cde_access_requires_unique_id():
    """Req 8.2.1: assign all users a unique ID before access to system components."""
    # No shared / generic accounts
    response = client.post('/cde-api/login', json={'username': 'shared-svc', 'password': 'secret'})
    assert response.status_code == 403

def test_cde_access_requires_mfa():
    """Req 8.4: implement MFA for all access into the CDE."""
    response = client.post('/cde-api/login', json={
        'username': 'alice@example.com',
        'password': correct_password,
        # No MFA token
    })
    assert response.status_code == 401
    assert response.json()['error'] == 'mfa_required'
```

## Step 6 — Logging (Req 10)

Cross-ref [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md):

```python
def test_pan_access_creates_audit_record():
    """Req 10.2: audit trails to reconstruct events."""
    user.access_card(card_id=123)
    audit = AuditLog.objects.filter(
        actor=user.id,
        action='pan_access',
        subject=f'card:{card_id}',
    ).first()
    assert audit is not None
    assert audit.timestamp is not None
    # Audit log itself MUST not contain the PAN:
    assert not re.search(r'\d{13,19}', audit.full_event_text)
```

## Step 7 — Scope reduction strategies

PCI DSS scope reduction is the highest-leverage cost-saving.

**Default: tokenization** — replace PAN with a non-sensitive token at the earliest possible boundary so downstream systems handle tokens only. This shrinks the CDE the most for the least integration churn in a typical SaaS architecture. Use the alternatives when tokenization doesn't fit:

| Strategy | Use when |
|---|---|
| Tokenization (default) | SaaS architecture; need to retain PAN reference for refunds / chargebacks |
| Hosted payment page (iframe) | Pre-tokenization not feasible; card data must never touch your servers |
| P2PE (point-to-point encryption) | Physical POS / card-present flows; encrypted at swipe with only decryption point in CDE |
| Network segmentation | Layered defense on top of one of the above; never the sole scope-reduction strategy |

Tests verify scope-reduction is actually reducing scope (Step 1).

**PAN-storage format default (Req 3.4):** prefer **tokenization** at the storage boundary; the four `is_*` checks in Step 3's `test_pan_stored_encrypted` are an OR because pre-existing systems may already use any of them, but for new storage paths pick tokenization and treat encryption / truncation / hashing as escape hatches when tokenization isn't feasible.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Trust developers to never log PAN | Eventually slipped into log line | Pattern-based assertion (Step 2) |
| CDE / non-CDE network policy not tested | Policy drift; segmentation breach | Per-system connectivity assertion (Step 1) |
| TLS 1.0 / 1.1 still enabled | Req 4 violation | Step 4 protocol check |
| Hardcoded encryption keys in repo | Req 3.6 violation; PAN exposure | Repo scan (Step 3) |
| Generic shared accounts (e.g., 'admin' / 'svc-account') | Req 8.2.1 violation | Step 5 unique-ID test |

## Limitations

- This skill targets PCI DSS v4.0 (current; replaces v3.2.1 March
  2025). Older v3.2.1 has subtle differences.
- QSA (Qualified Security Assessor) audit-style validation requires
  a credentialed assessor; tests verify implementation only.
- Some patterns (CVV regex) are inherently approximate; pair with
  QSA-validated DLP tooling.
- Scope-reduction strategies require organizational + technical
  changes beyond this skill.

## References

- [pci][pci] — PCI Security Standards Council
- pcisecuritystandards.org/document_library/ — PCI DSS v4.0 docs
- pcisecuritystandards.org/glossary/ — PCI terminology
- [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md),
  [`hipaa-test-patterns`](../hipaa-test-patterns/SKILL.md),
  [`ccpa-test-patterns`](../ccpa-test-patterns/SKILL.md),
  [`soc2-evidence-collector`](../soc2-evidence-collector/SKILL.md) —
  sister compliance pattern catalogs
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) —
  Req 10 audit log requirements
- [`compliance-readiness-reviewer`](../../agents/compliance-readiness-reviewer.md) — agent
