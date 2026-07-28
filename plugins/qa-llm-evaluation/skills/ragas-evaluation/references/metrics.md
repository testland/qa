# Ragas built-in metric catalog

Source: [docs.ragas.io/en/stable/concepts/metrics/available_metrics/](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/).
Pick 3 - 5 metrics per pipeline; running all 30+ on every PR blows up cost and latency.

## Retrieval Augmented Generation

| Metric | Use |
|---|---|
| Context Precision | Are the relevant chunks ranked high in the retrieved context? |
| Context Recall | Does the retrieved context contain ground-truth info? |
| Context Entities Recall | Entity-level recall vs ground truth |
| Noise Sensitivity | Does irrelevant context degrade output quality? |
| Response Relevancy | Does the response address the question? |
| Faithfulness | Are the response's claims grounded in retrieved context? |
| Multimodal Faithfulness | Faithfulness for text+image RAG |
| Multimodal Relevance | Relevance for text+image RAG |

## Nvidia Metrics

| Metric | Use |
|---|---|
| Answer Accuracy | Nvidia-blessed accuracy scoring |
| Context Relevance | Relevance scoring with Nvidia methodology |
| Response Groundedness | Groundedness in retrieved context |

## Agents/Tool Use

| Metric | Use |
|---|---|
| Topic Adherence | Does the agent stay on topic? |
| Tool Call Accuracy | Did it call the right tool? |
| Tool Call F1 | F1 score for tool selection |
| Agent Goal Accuracy | Did the agent achieve the user's goal? |

## Natural Language Comparison

| Metric | Use |
|---|---|
| Factual Correctness | Compares response facts vs ground truth |
| Semantic Similarity | Embedding-based similarity to reference |
| Non LLM String Similarity | String-distance metrics (no LLM call) |
| BLEU Score / ROUGE Score / CHRF Score | Classical NLP metrics |
| String Presence | Token presence check |
| Exact Match | Strict equality |

## SQL

| Metric | Use |
|---|---|
| Execution-based Datacompy Score | Run query, compare result-sets |
| SQL Query Equivalence | Semantic equivalence (different SQL, same result) |

## General Purpose

| Metric | Use |
|---|---|
| Aspect Critic | Yes/no LLM-judge on a custom aspect |
| Simple Criteria Scoring | Numeric scoring against a rubric |
| Rubrics-based Scoring | Multi-criterion rubric scoring |
| Instance-specific Rubrics Scoring | Per-row rubric variation |

## Other

| Metric | Use |
|---|---|
| Summarization | Summary quality scoring |
