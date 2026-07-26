# Mountebank predicate operators and proxying

Reference detail for [mountebank-imposters](../SKILL.md): the full
predicate-operator set and the record-playback proxy modes.

## Predicate operators

Mountebank supports several predicate operators in addition to
`equals`:

| Operator            | Meaning                                              |
|---------------------|------------------------------------------------------|
| `equals`            | Exact match.                                          |
| `deepEquals`        | Deep equality on a nested object (e.g. JSON body).    |
| `contains`          | Substring / partial match.                            |
| `startsWith` / `endsWith` | Affix matchers.                                |
| `matches`           | Regex match.                                          |
| `exists`            | Whether a field is present.                           |
| `not`               | Negate a child predicate.                             |
| `or`                | Boolean OR.                                           |
| `and`               | Boolean AND.                                          |
| `inject`            | Custom JavaScript predicate.                          |

## Proxying for record-playback

Set up an imposter as a **proxy** to a real upstream:

```json
{
  "port": 4545,
  "protocol": "http",
  "stubs": [{
    "predicates": [{ "matches": { "path": ".*" } }],
    "responses": [{
      "proxy": {
        "to": "https://real-upstream.example.com",
        "mode": "proxyOnce"
      }
    }]
  }]
}
```

| Mode             | Behavior                                                              |
|------------------|-----------------------------------------------------------------------|
| `proxyOnce`      | First request hits upstream; response is **stored as a stub**; subsequent identical requests replay. |
| `proxyAlways`    | Every request hits upstream; every response is stored.                |
| `proxyTransparent` | Pass-through; nothing recorded.                                     |

`proxyOnce` is the canonical record-playback workflow - run tests
once against a real upstream to populate the imposter, then run
forever offline.
