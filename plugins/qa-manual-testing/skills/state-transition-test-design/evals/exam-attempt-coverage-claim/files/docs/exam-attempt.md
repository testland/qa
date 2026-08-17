# Exam attempt - service spec

## Situations an attempt can be in

| Situation | What the candidate sees |
|---|---|
| NotStarted | Landing page with the Start button and the window's closing time |
| InProgress | Questions, answer controls, timer, Pause button |
| Paused | Grey overlay, Resume button, no question content, no submit |
| Ended | Read-only summary and the submitted-at time |

## Events the exam service accepts

| Event | Source |
|---|---|
| start-attempt | Candidate, Start button |
| answer-saved | Candidate's browser, `POST /attempts/{id}/answers` |
| pause-requested | Candidate, Pause button |
| resume-requested | Candidate, Resume button |
| finish-requested | Candidate, Submit button |
| exam-window-closes | Scheduler, at the published window end |
| proctor-terminates | Proctor console |

Seven events, and nothing else changes an attempt.

## Rules

- One attempt per candidate per booking. Start is offered once.
- Answers are saved individually as the candidate works.
- Pause is offered once per attempt and only while working.
- The paused overlay carries no submit control; the candidate resumes first.
- The exam window closing ends the attempt wherever the candidate is,
  including while paused.
- A proctor can terminate at any time before the attempt is over.
- An ended attempt is final: the summary is read-only and the score is
  computed from the answers held at that moment.
- `POST /attempts/{id}/answers` is a documented public endpoint. It is called
  by the browser app but nothing stops a candidate calling it directly.
