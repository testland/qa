# Judge validation, 2026-07-09

Two support leads labelled 50 outputs independently, acceptable or not
acceptable, and adjudicated the eight they first disagreed on. The grader was
then run over the same 50 outputs and its labels compared with theirs.

Items: sum-001 .. sum-050. These are the summarisation set — it was the only
group where we had labelled data in July.

    agreement: 42 / 50 = 84%

Human labels: 39 acceptable, 11 not acceptable.
Grader labels: 45 acceptable, 5 not acceptable.

Of the 8 items where the grader and the humans differed, the grader called 7 of
them acceptable where the leads had marked them not acceptable. On the
remaining one it went the other way.

Grader: openai:gpt-4o. System under test at the time: openai:gpt-4o-mini.

Rubric used: "Is this summary faithful to the ticket and free of invented
detail?" — pointwise, one output at a time, acceptable or not acceptable.

84% clears the 80% figure that gets quoted for a strong grader, so we stopped
there and have not repeated it.
