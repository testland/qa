# Judgment set (qrels) labeling recipes

Runnable labeling code for `hybrid-search-eval-author` Step 1. The three
methods, cheapest to most accurate, produce graded relevance labels
stored in TREC format `qid 0 doc_id grade`.

## Proxy labels from click logs / engagement signals (fastest)

```python
# Treat position-adjusted clicks as binary relevance
# Grade 2: clicked + dwell > 30s; Grade 1: clicked; Grade 0: impression only
def clicks_to_qrels(click_log_df):
    qrels = {}
    for _, row in click_log_df.iterrows():
        qid = row["query_id"]
        did = row["doc_id"]
        if row["dwell_s"] > 30:
            grade = 2
        elif row["clicked"]:
            grade = 1
        else:
            grade = 0
        qrels.setdefault(qid, {})[did] = grade
    return qrels
```

## LLM-assisted labeling (cost-effective at scale)

```python
import anthropic

def llm_grade(query: str, doc_text: str) -> int:
    """Return 0-3 relevance grade using an LLM as a judge."""
    client = anthropic.Anthropic()
    prompt = (
        f"Rate how relevant the document is to the query on a scale 0-3.\n"
        f"0=not relevant, 1=slightly, 2=relevant, 3=highly relevant.\n"
        f"Query: {query}\nDocument: {doc_text[:500]}\nReturn only the integer."
    )
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}]
    )
    return int(msg.content[0].text.strip())
```

## Human annotation via pooling (ground truth, expensive)

Retrieve top-20 from all candidate systems, pool unique results,
annotate each query-document pair once. Standard TREC methodology.
