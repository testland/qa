# Search API - response shapes we build against

`GET /v1/search/products?q=kettle`

```json
{
  "query": "kettle",
  "total_count": 2,
  "facets": [
    { "name": "brand", "count": 2 }
  ],
  "hits": [
    { "sku": "SKU-1001", "score": 0.91, "price_cents": 4200, "in_stock": true },
    { "sku": "SKU-1044", "score": 0.55, "price_cents": 3100, "in_stock": false }
  ]
}
```

`GET /v1/search/suggest?prefix=ket`

```json
{
  "prefix": "ket",
  "suggestions": [
    { "term": "kettle", "weight": 91 },
    { "term": "ketchup", "weight": 12 }
  ]
}
```
