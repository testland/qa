# What is currently standing on main, by rule

Full scan of main, 2026-09-09, 61 pages.

| Rule                | Pages affected | On the known list? | Notes                                   |
|---------------------|----------------|--------------------|-----------------------------------------|
| region              | 31             | 2 of 31            | every page built from the page template |
| landmark-one-main   | 29             | 1 of 29            | same template, same cause               |
| heading-order       | 7              | 1 of 7             | all 7 on /docs/*                        |
| color-contrast      | 12             | 2 of 12            | design-token work, scheduled Q4         |
| link-name           | 4              | 1 of 4             |                                         |
| frame-title         | 2              | 0 of 2             | support widget iframes                  |
| html-has-lang       | 1              | 0 of 1             |                                         |

The template gap (no `<main>` element) is ticketed as WEB-4102 and is scheduled
for Q4. Until it lands, every new page we publish arrives with a `region` and a
`landmark-one-main` finding on the day it goes live. We published 27 new pages
last quarter.
