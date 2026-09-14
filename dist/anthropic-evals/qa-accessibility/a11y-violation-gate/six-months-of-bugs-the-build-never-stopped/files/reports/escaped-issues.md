# Accessibility problems reported to support, March - August 2026

Every row below reached a user. Every row below shipped through a green build.
The last column is the scanner's own output for that exact element on that page,
re-checked by hand this week.

| #  | Reported   | Page              | What they told us                                                   | Scanner output for that element |
|----|------------|-------------------|---------------------------------------------------------------------|---------------------------------|
| 1  | 2026-03-04 | /checkout         | "the Place order button is grey on grey, I cannot read it"           | color-contrast, impact serious  |
| 2  | 2026-03-19 | /docs/api         | "headings jump from h2 straight to h4, I cannot skim the page"       | heading-order, impact moderate  |
| 3  | 2026-04-02 | /pricing          | "the per-seat line is too faint to read on my laptop"                | color-contrast, impact serious  |
| 4  | 2026-04-08 | /login            | "the sign-in frame is just announced as 'frame'"                     | frame-title, impact serious     |
| 5  | 2026-04-21 | /docs/sdk         | "same heading jump as the API page"                                  | heading-order, impact moderate  |
| 6  | 2026-05-05 | /blog/spring-note | "body text on the post is washed out"                                | color-contrast, impact serious  |
| 7  | 2026-05-06 | /blog/spring-note | same as 6, different reporter                                        | color-contrast, impact serious  |
| 8  | 2026-05-12 | /pricing          | "the comparison charts have alt text but it just reads chart-1.png"  | image-alt: pass. `<img src="chart-1.png" alt="chart-1.png">` |
| 9  | 2026-05-30 | /account          | "the settings icon link is announced as just 'link'"                 | link-name, impact serious       |
| 10 | 2026-06-11 | /                 | "my screen reader reads the whole page in the wrong language"        | html-has-lang, impact serious   |
| 11 | 2026-06-18 | /docs             | "every link in the sidebar is 'read more', I cannot tell them apart" | link-name: pass. `<a href="/docs/webhooks">read more</a>`, and three siblings like it |
| 12 | 2026-06-24 | /docs/webhooks    | "same heading jump again"                                            | heading-order, impact moderate  |
| 13 | 2026-07-02 | /account          | same as 9, different reporter                                        | link-name, impact serious       |
| 14 | 2026-07-15 | /support          | "the help widget frame has no title"                                 | frame-title, impact serious     |
| 15 | 2026-07-29 | /webinars         | "the recorded sessions have no captions"                             | video-caption: `"score": null, "scoreDisplayMode": "manual"` |
| 16 | 2026-08-27 | /dashboard        | "opening the filter drawer drops focus at the bottom of the page"    | full scan of /dashboard: 0 violations, 94 passes, 3 incomplete |

Rows 2, 5, 11, 12 and 16 came from screen-reader users; the rest from sighted
customers or internal readers.

For the same period the check itself blocked two pull requests, both for a form
control with no accessible name, and neither of those ever reached a user.
