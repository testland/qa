# Catalog API - sample successful responses

`GET /v1/products`

```json
{
  "products": [
    { "sku": "SKU-1001", "name": "Stovetop kettle", "price_cents": 4200, "in_stock": true },
    { "sku": "SKU-1002", "name": "Pour-over filter", "price_cents": 900, "in_stock": false }
  ],
  "page": 1,
  "total": 2
}
```

`GET /v1/products/SKU-1001`

```json
{
  "product": { "sku": "SKU-1001", "name": "Stovetop kettle", "price_cents": 4200, "in_stock": true }
}
```

`GET /v1/products/SKU-1001/reviews`

```json
{
  "reviews": [
    { "review_id": "RV-7", "rating": 4, "author": "j.doe" }
  ],
  "average_rating": 4.0
}
```

`GET /v1/search?q=kettle`

```json
{
  "hits": [
    { "sku": "SKU-1001", "score": 0.91 }
  ],
  "query": "kettle"
}
```
