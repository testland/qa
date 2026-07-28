# Stub matching, response shaping, and stateful scenarios

## Stub matching

The `stubFor` DSL composes a request-matcher chain:

| Matcher                                | Purpose                                                  |
|----------------------------------------|----------------------------------------------------------|
| `get("/path")` / `post("/path")` / etc.| HTTP verb + path matcher.                                 |
| `urlPathMatching("/users/[0-9]+")`     | Regex on path.                                            |
| `withHeader("Content-Type", containing("json"))` | Header value matcher.                          |
| `withQueryParam("status", equalTo("active"))`     | Query parameter matcher.                       |
| `withRequestBody(matchingJsonPath("$.amount", greaterThan(0)))` | JSON-path body matcher.            |
| `withCookie("session", equalTo("abc"))` | Cookie matcher.                                           |

Stubs are **first-match-wins** by default; the most specific stub
should be registered first.

## Response shaping

```java
stubFor(get("/orders/42")
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("{\"order_id\": 42}")
        .withFixedDelay(500)               // simulate latency
        // OR
        .withChunkedDribbleDelay(5, 1000)  // simulate slow chunked transfer
    ));
```

Common helper response builders:

| Helper                                | Effect                                           |
|---------------------------------------|--------------------------------------------------|
| `ok()`                                | 200 OK with empty body.                          |
| `okJson("...")`                       | 200 + `Content-Type: application/json` + body.   |
| `notFound()`, `badRequest()`, `serverError()` | 404 / 400 / 500.                       |
| `temporaryRedirect("/new")`           | 307 + Location.                                  |

## Stateful stubs (scenarios)

For workflows that depend on prior state (e.g. "first call returns
empty cart, second call returns populated cart"):

```java
stubFor(get("/cart")
    .inScenario("Add to cart")
    .whenScenarioStateIs(STARTED)
    .willReturn(okJson("[]")));

stubFor(post("/cart/add")
    .inScenario("Add to cart")
    .whenScenarioStateIs(STARTED)
    .willSetStateTo("Added")
    .willReturn(ok()));

stubFor(get("/cart")
    .inScenario("Add to cart")
    .whenScenarioStateIs("Added")
    .willReturn(okJson("[{\"sku\":\"SKU-1\"}]")));
```
