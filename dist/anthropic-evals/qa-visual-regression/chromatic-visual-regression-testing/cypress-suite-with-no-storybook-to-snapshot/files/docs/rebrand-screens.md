# Screens that must not break in the rebrand

| # | Route                | Spec                               | Data                                          |
|---|----------------------|------------------------------------|-----------------------------------------------|
| 1 | `/login`             | `cypress/e2e/login.cy.js`          | none; static, no session                       |
| 2 | `/settings/profile`  | `cypress/e2e/profile.cy.js`        | `cy.task('db:seed', 'user-fixture')`           |
| 3 | `/invoices/INV-1042` | `cypress/e2e/invoice.cy.js`        | `cy.task('db:seed', 'invoice-fixture')`        |
| 4 | `/invoices` (empty)  | `cypress/e2e/invoices-empty.cy.js` | `cy.task('db:seed', 'empty-tenant')`           |
| 5 | `/error/500`         | `cypress/e2e/error.cy.js`          | none; rendered directly                        |
| 6 | `/dashboard`         | `cypress/e2e/dashboard.cy.js`      | not seeded; reads the shared staging database  |

All six routes except `/login` and `/error/500` are behind the session that
`cy.login()` establishes.
