# PMD Apex security rules

The 10-rule `category/apex/security.xml` catalog plus per-rule detail for
`pmd-apex-rules`. All entries per
[pmd.github.io - Apex Security Rules][pmd-apex-sec].

[pmd-apex-sec]: https://pmd.github.io/pmd/pmd_rules_apex_security.html

| Rule | What it detects |
|------|-----------------|
| `ApexSOQLInjection` | Dynamic SOQL/DML built by string concatenation with untrusted input |
| `ApexCRUDViolation` | Missing object/field permission check before SOQL, SOSL, or DML |
| `ApexSharingViolations` | Classes performing DML without an explicit sharing keyword |
| `ApexBadCrypto` | Hard-coded IVs or keys in cryptographic operations |
| `ApexDangerousMethods` | Calls to `Configuration.disableTriggerCRUDSecurity()` or sensitive `System.debug()` |
| `ApexInsecureEndpoint` | Plain HTTP (non-HTTPS) callout endpoints |
| `ApexOpenRedirect` | Redirects using unsanitized user-controlled input |
| `ApexSuggestUsingNamedCred` | Hard-coded credentials in HTTP headers; suggests Named Credentials |
| `ApexXSSFromEscapeFalse` | `addError()` called with escape disabled, exposing raw user content |
| `ApexXSSFromURLParam` | URL parameters used in output contexts without escaping |

## ApexSOQLInjection

Per [pmd-apex-sec][pmd-apex-sec]: "Detects the usage of untrusted / unescaped
variables in DML queries."

Non-compliant:

```apex
public class Foo {
    public void test1(String t1) {
        Database.query('SELECT Id FROM Account' + t1);
    }
}
```

Compliant (bind variable - automatically sanitized by the Apex runtime):

```apex
public class Foo {
    public void test1(String accountName) {
        List<Account> accounts = [SELECT Id FROM Account WHERE Name = :accountName];
    }
}
```

## ApexCRUDViolation

Per [pmd-apex-sec][pmd-apex-sec]: "The rule validates you are checking for
access permissions before a SOQL/SOSL/DML operation." Accepted remediation
paths include `DescribeSObjectResult` system checks, `WITH SECURITY_ENFORCED`,
or (since Winter '23 / API v56) `WITH USER_MODE`.

The rule is configurable for custom authorization facades via regex properties
(`createAuthMethodPattern`, `readAuthMethodPattern`, etc.) so teams using an
internal ESAPI wrapper can still pass the check.

## ApexSharingViolations

Per [pmd-apex-sec][pmd-apex-sec]: "Detect classes declared without explicit
sharing mode if DML methods are used." The three accepted keywords are `with
sharing`, `without sharing`, and `inherited sharing`. The intent is to force
a conscious declaration of sharing posture, not to mandate a specific value.
