# gosec rule ID catalog

Per [github.com/securego/gosec][gs-gh] the common rule IDs. This is a
lookup table for interpreting a finding's rule ID; the authoritative
current list is emitted at runtime by `gosec -list-rules`.

[gs-gh]: https://github.com/securego/gosec

| Rule | Description |
|---|---|
| G101 | Hardcoded credentials |
| G102 | Bind to all interfaces (0.0.0.0) |
| G103 | Audit unsafe block (use of `unsafe` package) |
| G104 | Unhandled errors |
| G106 | SSH InsecureIgnoreHostKey |
| G107 | URL with potential SSRF |
| G201 | SQL query construction by string concat |
| G202 | SQL query construction by string format |
| G204 | Subprocess launched with variable |
| G301 | Poor file permissions on directory |
| G302 | Poor file permissions on file |
| G303 | Predictable temp-file name |
| G304 | File path traversal vulnerabilities |
| G305 | File traversal in tar archive |
| G401 | Weak cryptographic algorithms |
| G402 | TLS InsecureSkipVerify |
| G403 | RSA key length too short |
| G404 | Insecure random number generation |
| G501-G505 | Insecure crypto primitives (DES, MD5, RC4, SHA1) |
| G601 | Implicit memory aliasing in for-range |
| G602 | Slice bounds out of range |

Prefix families at a glance: G1xx credential / injection / unsafe
surface, G2xx SQL and subprocess construction, G3xx file and path
handling, G4xx crypto and TLS misuse, G5xx insecure crypto
primitives, G6xx Go memory and slice hazards.

Full list: gosec subcommand `gosec -list-rules`.
