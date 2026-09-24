# Ticket #8814 — Aldermoor Legal (Enterprise, renewal 2026-11-02)

Reporter: account admin, relaying for 4 users on Dragon Professional.

> Three of us dictate. Since the update, mail disappears while we talk. One of
> my associates lost eleven threads into the archive over a fortnight — they
> were all recoverable from All Mail but she did not know that for nine days.
> Twice the screen jumped to the search field in the middle of a sentence.
> We have turned off dictation inside your app, which rather defeats it.

Support notes:

- Reproduced in-house with Dragon 16: dictating "everything's fine" into the
  compose box emitted `e` before the compose field took focus on a slow render,
  and the open thread archived.
- Reproduced with Windows Speech Recognition: dictated punctuation emitted `/`
  while focus was on the thread list; the search box took focus.
- Reproduced once with Dragon: dictating a question with the thread list
  focused emitted `?` and the help sheet opened over the message.
- No preferences UI exists for key bindings today. The settings page has a
  "Keyboard" section with nothing in it but a link to the help article.
