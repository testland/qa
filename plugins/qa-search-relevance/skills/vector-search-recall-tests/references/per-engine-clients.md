# Per-engine clients and deprecated APIs

Engine-specific client code for `vector-search-recall-tests`. The core
runnable sweep uses the Qdrant client inline in SKILL.md Step 3; other
engines expose `ef` and search differently.

## Weaviate v4

In Weaviate v4 `ef` is not a query argument: it is a collection
`vectorIndexConfig` setting, so the sweep updates the collection config
between rounds, then re-queries (per the [Weaviate Python client docs]):

```python
from weaviate.classes.config import Reconfigure
from weaviate.classes.query import MetadataQuery

def set_weaviate_ef(client, ef, vector_name="default"):
    client.collections.use("Docs").config.update(
        vector_config=Reconfigure.Vectors.update(
            name=vector_name,
            vector_index_config=Reconfigure.VectorIndex.hnsw(ef=ef),
        ),
    )

def weaviate_search(client, query_vec, k=10):
    resp = client.collections.use("Docs").query.near_vector(
        near_vector=query_vec, limit=k, return_metadata=MetadataQuery(distance=True)
    )
    return [o.uuid for o in resp.objects]  # match against UUID-keyed ground truth
```

## Deprecated / old APIs

- **qdrant-client < 1.18**: `client.search()` was removed; use
  `client.query_points()` with `SearchParams(hnsw_ef=ef)` (SKILL.md
  Step 3).
- **Weaviate v3**: query and `ef` APIs differ from v4; v4 moved `ef`
  to the collection `vectorIndexConfig` (see above).

[Weaviate Python client docs]: https://docs.weaviate.io/weaviate/client-libraries/python
