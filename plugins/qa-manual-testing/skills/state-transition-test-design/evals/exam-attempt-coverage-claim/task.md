# Our exam coverage report says 100% and we do not believe it

## Problem Description

We run online certification exams. A candidate opens their attempt, works
through it, can pause once for a comfort break, and submits when they are
done. The exam window closes at a fixed time whatever the candidate is doing,
including mid-break. A proctor watching the webcam feed can terminate an
attempt for suspected cheating, which ends it on the spot with whatever
answers are already saved.

Answers save as the candidate goes. The paused screen is a plain overlay with
a Resume button and no question content, and the submit control is not on it -
a candidate has to resume before they can submit. The client is a browser app
and it posts every answer change to our API; the API is public, documented,
and a candidate who opens devtools can post whatever they like whenever they
like.

The QA lead keeps a coverage spreadsheet with one row per screen the attempt
can show. All four rows are ticked and the report goes to the certification
board every month saying attempt handling is fully covered. Nobody on the team
can explain what "fully covered" is measuring, and last month a candidate's
answers changed after their attempt had already ended and the board wants to
know how that passed a full-coverage suite.

## Output Specification

Produce `docs/exam-attempt-coverage.md` containing:

1. The model the cases come from: for each situation an attempt can be in,
   what the exam service does with each of the events it accepts.
2. Numbered manual test cases with steps and per-step expected results,
   runnable by a tester with a candidate account, a proctor account, and an
   API client for the documented endpoints.
3. An explicit coverage statement: what you are counting as covered, how many
   of those there are in total, how many your cases reach, and the resulting
   figure.
4. A direct answer to the lead's claim - what ticking all four screens does
   and does not tell the board.

Webcam capture, question banks, and score calculation are out of scope. Do not
write code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/exam-attempt.md ===============
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
