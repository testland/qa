# Payments squad - tooling inventory (reviewed 2026-09-15)

| Layer                   | Tool                                          | Status |
|-------------------------|-----------------------------------------------|--------|
| Unit                     | node --test (built in)                        | In use |
| Property-based           | fast-check 3.x                                | In use, added 2026-06 |
| Integration              | node --test + Testcontainers (MariaDB)        | In use |
| Contract                 | -                                             | **None.** The provider is external and publishes no broker; no consumer-driven contract tooling is installed and none is budgeted for FY27. |
| E2E                      | Playwright                                     | In use |
| Load                     | k6 Cloud, 2 seats                              | In use |
| Chaos / fault injection  | -                                             | **None.** The vendor trial ended 2026-07-31 and procurement declined the renewal for FY27. No approved substitute. |
| Visual regression        | Playwright toHaveScreenshot                    | In use |
| Manual / UAT             | Finance team (Lena books slots); sanctions team via compliance | In use |
| Threat modelling         | Security guild, one session per quarter, bookable | In use |
