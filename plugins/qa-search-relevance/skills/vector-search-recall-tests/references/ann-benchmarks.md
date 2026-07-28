# ANN-Benchmarks cross-engine baseline

Clone-and-run detail for `vector-search-recall-tests` Step 6. Per the
[ANN-Benchmarks docs], the framework "evaluates 37+ ANN algorithms ...
by plotting recall against queries per second across various datasets"
including HNSW (multiple impls), FAISS IVF, ScaNN, Annoy, Qdrant,
Weaviate, Milvus.

```bash
git clone https://github.com/erikbern/ann-benchmarks.git
cd ann-benchmarks
python install.py --algorithm hnswlib
python run.py --algorithm hnswlib --dataset glove-100-angular
python plot.py --dataset glove-100-angular
```

Outputs per-engine recall/QPS curves. Use to pick an engine + initial
parameter set.

Note ANN-Benchmarks uses synthetic datasets (GloVe, SIFT, GIST);
in-domain corpora behave differently, so treat the curves as a starting
point, not a substitute for the in-product recall test in SKILL.md
Steps 1-4.

[ANN-Benchmarks docs]: https://ann-benchmarks.com/
