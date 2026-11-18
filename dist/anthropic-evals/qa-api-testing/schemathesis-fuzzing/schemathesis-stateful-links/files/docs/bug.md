Production bug: after DELETE /orders/{id} returns 204, GET /orders/{id} still returns 200 for about
60 seconds (stale cache). Our Schemathesis run is green: it only ever sends random order ids, which all 404.
