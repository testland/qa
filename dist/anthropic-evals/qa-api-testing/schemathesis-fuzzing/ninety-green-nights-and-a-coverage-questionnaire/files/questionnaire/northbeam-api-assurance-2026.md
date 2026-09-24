# Northbeam Clinical - annual API assurance questionnaire
# Supplier: Northbeam Clinical Platform team. Due 2026-09-14 17:00.
# Answers below pre-filled by M. Ilves, 2026-09-14 08:40.

| # | Question | Answer | Supplier evidence |
|---|----------|--------|-------------------|
| 1 | Is every operation the service exposes exercised by an automated test suite? | Yes | nightly job, green 90 nights |
| 2 | Are response bodies validated against a published contract, or only status codes? | Yes, full body validation | nightly job |
| 3 | Are unexpected server errors treated as a build failure rather than logged? | Yes | nightly job |
| 4 | Are file-upload and form-encoded operations exercised with adverse and boundary inputs to the same standard as JSON operations? | Yes | nightly job |
| 5 | Are response media types validated against the contract? | Yes | nightly job |
| 6 | Have all findings raised by the suite in the last 12 months been resolved? | Yes | findings log |
| 7 | State the number of generated cases per operation per run, and justify it as sufficient. | 300, deep enough | nightly job |
