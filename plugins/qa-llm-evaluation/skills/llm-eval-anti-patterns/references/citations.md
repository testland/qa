# Academic citations

Full references for the justifications in SKILL.md. Each parenthetical
author-year token in the body resolves here.

- **(Miller 2024)** Miller, *Adding Error Bars to Evals: A Statistical Approach
  to Language Model Evaluations*, arXiv:2411.00640,
  https://arxiv.org/abs/2411.00640. Evals are experiments; a suite's questions
  are a sample, so scores carry sampling error that must be quantified. A
  single run of a stochastic model is one draw. Running both variants on the
  same questions (paired structure) measures the difference far more precisely
  than comparing two independent scores.
- **(Magar and Schwartz 2022)** Magar and Schwartz, *Data Contamination: From
  Memorization to Exploitation*, ACL 2022,
  https://aclanthology.org/2022.acl-short.18/. Test-set contamination separates
  into memorization (the model retains the contaminated data) and exploitation
  (it uses that data to score better downstream), with duplication count and
  model size affecting the two differently.
- **(Zheng 2023)** Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and
  Chatbot Arena*, NeurIPS 2023 Datasets and Benchmarks, arXiv:2306.05685,
  https://arxiv.org/abs/2306.05685. LLM judges exhibit position bias, verbosity
  bias, self-enhancement bias, and limited reasoning. A strong judge, once
  measured, can reach over 80% agreement with human preferences - about the
  level humans agree with each other.
- **(Panickssery 2024)** Panickssery, Bowman and Feng, *LLM Evaluators
  Recognize and Favor Their Own Generations*, arXiv:2404.13076,
  https://arxiv.org/abs/2404.13076. Models score their own outputs higher than
  others' that humans rate equal, and the strength of that self-preference
  correlates linearly with the model's ability to recognize its own text.
- **(Shankar 2024)** Shankar et al., *Who Validates the Validators?*,
  arXiv:2404.12272, https://arxiv.org/abs/2404.12272. LLM-generated evaluators
  inherit the problems of the models they evaluate and require human validation
  before their scores mean anything; also documents criteria drift, where the
  grading criteria users actually want depend on the outputs they have seen.
- **(Perez 2022)** Perez et al., *Red Teaming Language Models with Language
  Models*, arXiv:2202.03286, https://arxiv.org/abs/2202.03286. Using language
  models to generate test cases against a 280B-parameter chatbot uncovered tens
  of thousands of offensive replies, private contact information, training-data
  leakage, and multi-turn harms. Explicitly one tool among several, not a
  complete safety answer.
