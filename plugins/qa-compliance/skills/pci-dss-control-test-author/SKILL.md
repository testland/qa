---
name: pci-dss-control-test-author
description: "Build-an-X for PCI DSS v4.0 scope verification - cardholder data environment (CDE) boundary tests, segmentation tests (PCI Req 1), prohibited-data-storage assertions per Req 3 (no full track data, no CVV/CAV2/CVC2/CID, no PIN/PIN block post-authorization), key-management tests per Req 3.6, encryption-of-transmissions per Req 4. Use when authoring PCI DSS scope-reduction + control tests for any system handling payment-card data."
---

# pci-dss-control-test-author

This is a **build-an-X workflow** for verifying CDE scope is correctly bounded and prohibited-data assertions are captured in fixtures, targeting PCI DSS v4.0 (fully required March 2025).

## Helper stubs

Key interfaces used across steps (provided by the test harness):

```python
# network / infra
def network_policy.get_allowed_connections(src: str, dst: str) -> list[str]: ...

# data-access
def export_database() -> DatabaseDump: ...
def recent_logs() -> list[LogEntry]: ...
def scan_repo_files() -> list[str]: ...
def read_file(path: str) -> str: ...

# TLS inspection - TLSInfo has: .protocol (str e.g. 'TLSv1.2'), .cipher_strength (int), .cipher (str)
def inspect_tls(endpoint: str) -> TLSInfo: ...

# crypto / format
def is_encrypted_aes_256(value: str) -> bool: ...
def is_truncated_last_4(value: str) -> bool: ...
def is_hashed_with_salt(value: str) -> bool: ...
def is_tokenized(value: str) -> bool: ...
def redact(value: str) -> str: ...

# constants
CDE_API_ENDPOINTS: list[str] = [...]   # All API endpoints inside the CDE
DEPRECATED_CIPHERS: list[str] = [...]  # e.g. ['RC4', 'DES', '3DES', 'NULL']
```

---

## Step 1 - Define + assert CDE boundary

```python
# pci_scope.py
# untested CDE/non-CDE network policy drifts into a segmentation breach
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

> **Checkpoint:** If any CDE/non-CDE boundary assertion fails, halt and remediate the
> network policy before proceeding. A segmentation failure means downstream steps may
> be testing a mis-scoped environment.

---

## Step 2 - Assert no SAD storage post-authorization (Req 3.2)

SAD may transit during auth but **storage after auth completes** (logs, DB, audit trails, backup) is **forbidden** - full track data, CVV2/CVC2/CID, and PIN/PIN block, all never post-authorization.

```python
import re

# PAN slips into a log line if you trust developers never to log it
TRACK1_PATTERN = re.compile(r'%[A-Z]\d{12,19}\^[^\?]*\?\d*\?')   # Track 1
CVV_PATTERN    = re.compile(r'(?<!\d)\d{3,4}(?!\d)')               # naive; pair with DLP

def test_no_full_track_data_in_storage():
    """Req 3.2.1: track data must not be retained post-authorization."""
    db_dump = export_database()
    for table in db_dump.tables:
        for row in table:
            for value in row.values():
                assert not TRACK1_PATTERN.search(str(value)), \
                    f"Full track data in {table.name}"

def test_no_cvv_in_logs():
    """Req 3.2.2: CVV2/CVC2/CID must not be retained."""
    log_entries = recent_logs()
    for entry in log_entries:
        # Look for proximity of CVV-like 3-4 digit numbers near "cvv" / "card" tokens
        if 'cvv' in entry.text.lower() or 'card' in entry.text.lower():
            matches = CVV_PATTERN.findall(entry.text)
            for m in matches:
                assert m == '***' or m == '----', \
                    f"Possible CVV in log: {entry.id}"
```

> **Checkpoint:** If SAD is found in storage or logs, **halt and remediate** before
> proceeding to Step 3. Continuing to test encryption-at-rest while SAD is present
> misrepresents compliance posture. File a severity-1 finding and trigger your incident
> response process before re-running.

---

## Step 3 - Assert PAN encryption at rest (Req 3.4) + key management (Req 3.6)

```python
# hardcoded encryption keys in the repo are a Req 3.6 violation and expose PAN

def test_pan_stored_encrypted():
    """Req 3.4: PAN unreadable wherever stored (encryption / truncation / hashing / tokenization).
    Prefer tokenization for new paths; treat the others as escape hatches for pre-existing systems.
    """
    card_record = CardVault.objects.first()
    raw_pan = card_record._raw_pan_field    # accessor for storage-format field

    # Format MUST be one of:
    #  - encrypted (AES-256 or stronger)         <- preferred for new paths
    #  - truncated (e.g., last 4 only)
    #  - hashed (with salt; one-way)
    #  - tokenized (replaced with non-sensitive token)  <- default for new systems
    valid_format = (
        is_encrypted_aes_256(raw_pan)
        or is_truncated_last_4(raw_pan)
        or is_hashed_with_salt(raw_pan)
        or is_tokenized(raw_pan)
    )
    assert valid_format, f"PAN stored unprotected: {redact(raw_pan)}"

def test_decryption_keys_not_in_app_repo():
    """Req 3.6: cryptographic keys protected against unauthorized access."""
    repo_files = scan_repo_files()
    for f in repo_files:
        content = read_file(f)
        # No hardcoded AES keys (high entropy + length 256+ bits)
        assert not re.search(r'AES_KEY\s*=\s*["\'][A-Za-z0-9+/=]{40,}', content), \
            f"Possible hardcoded AES key in {f}"
        # No KMS key file references
        assert 'kms-private-key.pem' not in f, \
            f"KMS private key file referenced in repo: {f}"
```

> **Checkpoint:** If PANs are stored unprotected or keys are found in the repo, halt.
> Key-in-repo findings require immediate secret rotation before continuing.

---

## Step 4 - Encryption of transmissions (Req 4)

```python
# TLS 1.0 / 1.1 still enabled is a Req 4 violation
def test_pan_only_transmitted_via_strong_crypto():
    """Req 4.2.1: strong crypto for transmission of cardholder data over open networks."""
    for endpoint in CDE_API_ENDPOINTS:
        tls_info = inspect_tls(endpoint)
        assert tls_info.protocol >= 'TLSv1.2', \
            f"Weak TLS protocol on {endpoint}: {tls_info.protocol}"
        assert tls_info.cipher_strength >= 256, \
            f"Cipher strength too low on {endpoint}: {tls_info.cipher_strength}"
        assert tls_info.cipher not in DEPRECATED_CIPHERS, \
            f"Deprecated cipher on {endpoint}: {tls_info.cipher}"
```

> **Checkpoint:** TLS failures on any CDE endpoint are blocking. Deprecated protocols
> (TLS 1.0 / 1.1) must be disabled before proceeding to access-control testing.

---

## Step 5 - Access control (Req 7 + 8)

```python
# generic shared accounts (e.g. 'admin' / 'svc-account') violate Req 8.2.1
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

> **Checkpoint:** Shared-account or MFA bypass failures are blocking. Do not proceed
> to logging tests while unauthorized access paths remain open.

---

## Step 6 - Logging (Req 10)

Cross-ref `audit-trail-test-author`:

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
    assert not re.search(r'\d{13,19}', audit.full_event_text), \
        "PAN found in audit log text - log masking is broken"
```

---

## Step 7 - Scope reduction strategies

PCI DSS scope reduction is the highest-leverage cost saving. Default: **tokenization** - replace the PAN with a non-sensitive token at the earliest possible boundary so downstream systems handle tokens only, which shrinks the CDE the most for the least integration churn. The alternatives (hosted iframe payment page, P2PE for card-present flows, network segmentation as layered defense only) and the Req 3.4 storage-format rationale are in [references/strategies.md](references/strategies.md).

**PAN-storage format default (Req 3.4):** the four `is_*` checks in Step 3's `test_pan_stored_encrypted` are an OR because pre-existing systems may already use any of them; for new storage paths pick tokenization and treat encryption / truncation / hashing as escape hatches.

## Limitations

- Targets PCI DSS v4.0; v3.2.1 has subtle differences.
- QSA audit-style validation requires a credentialed assessor; tests verify implementation only.
- CVV regex patterns are approximate; pair with QSA-validated DLP tooling.
- Scope-reduction strategies require organizational and technical changes beyond this skill.

## References

- PCI Security Standards Council: [home](https://www.pcisecuritystandards.org/), [document library](https://www.pcisecuritystandards.org/document_library/) (PCI DSS v4.0 docs), [glossary](https://www.pcisecuritystandards.org/glossary/)
- Sister catalogs: `gdpr-test-patterns`, `hipaa-test-patterns`, `ccpa-test-patterns`, `soc2-evidence-collector`
- `audit-trail-test-author` - Req 10 audit log requirements
