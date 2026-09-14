# Payments squad - tooling inventory (reviewed 2026-09-15)

| Layer                   | Tool                                          | Status |
|-------------------------|-----------------------------------------------|--------|
| Unit                     | node --test (built in)                        | In use |
| Property-based           | fast-check 3.x                                | In use, added 2026-06 |
| Integration              | node --test + Testcontainers (MariaDB)        | In use |
| Contract                 | -                                             | Not installed; the provider is external and publishes no broker. Nothing budgeted for FY27. |
| E2E                      | Playwright                                     | In use |
| Load                     | k6 Cloud, 2 seats                              | In use |
| Chaos / fault injection  | -                                             | Vendor trial ended 2026-07-31; procurement declined the FY27 renewal. No approved substitute. |
| Visual regression        | Playwright toHaveScreenshot                    | In use |
| Manual / UAT             | Finance team (Lena books slots); sanctions team via compliance | In use |
| Threat modelling         | Security guild, one session per quarter, bookable | In use |
