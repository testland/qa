# Our travel agent passes its Ragas eval after booking the wrong flight

## Problem Description

Our travel agent passes its Ragas eval (`eval/agent_eval.py`) even when it books the wrong flight (`traces/bad_booking.json`). Fix the evaluation so this case fails, using the current Ragas.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: eval/agent_eval.py ===============
from ragas import evaluate
from ragas.metrics import answer_correctness
from datasets import Dataset

# only the final message of each conversation is scored
ds = Dataset.from_dict({
    "question": ["Book me the cheapest flight from LCA to LHR on 12 December"],
    "answer": ["Done! You're booked on the cheapest flight to London Heathrow on 12 December."],
    "ground_truth": ["Booked the cheapest LCA to LHR flight on 2026-12-12."],
})
print(evaluate(ds, metrics=[answer_correctness]))

=============== FILE: traces/bad_booking.json ===============
{
  "messages": [
    {
      "role": "user",
      "content": "Book me the cheapest flight from LCA to LHR on 12 December"
    },
    {
      "role": "assistant",
      "tool_calls": [
        {
          "name": "search_flights",
          "args": {
            "origin": "LCA",
            "destination": "LHR",
            "date": "2026-12-21"
          }
        }
      ]
    },
    {
      "role": "tool",
      "content": "[{\"id\": \"BA663\", \"price\": 129}, {\"id\": \"A3612\", \"price\": 98}]"
    },
    {
      "role": "assistant",
      "tool_calls": [
        {
          "name": "book_flight",
          "args": {
            "flight_id": "A3612"
          }
        }
      ]
    },
    {
      "role": "tool",
      "content": "{\"status\": \"confirmed\"}"
    },
    {
      "role": "assistant",
      "content": "Done! You're booked on the cheapest flight to London Heathrow on 12 December."
    }
  ]
}
