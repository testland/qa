# Open advisories against installed versions, 2026-09-08

| Package  | Installed | Advisory                                          | Severity | Patched versions      |
|----------|-----------|---------------------------------------------------|----------|-----------------------|
| `axios`  | 0.27.2    | Server-side request forgery via redirect handling | High     | `>= 1.8.2`            |
| `lodash` | 4.17.20   | Command injection in `template`                   | High     | `>= 4.17.21`          |
| `sharp`  | 0.32.6    | Out-of-bounds write in the bundled decoder        | High     | `>= 0.33.5`           |
| `django` | 4.2.16    | Denial of service in `URLValidator`               | Moderate | `>= 4.2.18`, `>= 5.0.11` |
| `boto3`  | 1.34.51   | none open                                         | -        | -                     |

On-call was paged four times this month against this list: three for `sharp`,
one for `axios`.
