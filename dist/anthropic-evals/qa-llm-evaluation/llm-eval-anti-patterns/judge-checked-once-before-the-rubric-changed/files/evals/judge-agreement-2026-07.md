# Judge validation, 2026-07-09

Two support leads labelled 50 outputs independently, acceptable or not
acceptable, and adjudicated the eight they disagreed on. The grader was then
run over the same 50 with the same rubric and its labels compared.

Items: sum-001 .. sum-050. These are the summarisation set — it was the only
group where we had labelled data in July.

    agreement: 42 / 50 = 84%

Human labels: 39 acceptable, 11 not acceptable.
Grader labels: 41 acceptable, 9 not acceptable.
Grader: openai:gpt-4o. System under test at the time: openai:gpt-4o-mini.

Rubric used: "Is this summary faithful to the ticket and free of invented
detail?" — pointwise, one output at a time, acceptable or not.

84% clears the 80% bar that gets quoted for strong graders, so we stopped
there and have not repeated it.
