# AI/ML & data-pipeline QA

AI/ML & data-pipeline QA role bundle: one-command install of LLM evaluation, ML model testing (including the Jupyter notebook CI pipeline), AI-assisted test generation, search relevance, and data quality.

Installing this one plugin installs all 5 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-ai@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-llm-evaluation** - LLM and prompt evaluation
- **qa-ml-models** - ML model testing + the Jupyter notebook CI pipeline
- **qa-ai-assisted** - AI-assisted test generation + curation
- **qa-search-relevance** - Search relevance testing
- **qa-data-quality** - Data quality testing for analytical pipelines

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
