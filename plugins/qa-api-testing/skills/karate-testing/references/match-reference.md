# Karate keyword and match-modifier reference

Companion to the karate-testing skill: the full step-keyword table and the
complete `match` modifier vocabulary. Per
[karate-docs](https://docs.karatelabs.io/).

## Step keywords

| Keyword | Purpose |
|---------|---------|
| `Feature:`           | One per file; describes the API surface under test. |
| `Scenario:`          | One per case; mirrors a single user / API journey. |
| `Background:`        | Steps that run before each Scenario (auth, base URL setup). |
| `Given url '...'`    | Set the request URL.                                |
| `Given path '...'`   | Append a path segment to the URL.                   |
| `Given header X = Y` | Set a request header.                                |
| `Given param X = Y`  | Set a query parameter.                               |
| `Given request {...}`| Set the JSON body.                                   |
| `When method <verb>` | Issue the HTTP request: `get`, `post`, `put`, `delete`. |
| `Then status N`      | Assert the response status code.                     |
| `And match expr`     | Assert response body / header / variable shape.     |

## Match examples

```gherkin
# Equality on the whole response
And match response == { id: 1, name: 'Alice' }

# Type fuzzy: any number, any string
And match response == { id: '#number', name: '#string' }

# Regex constraint
And match response.email == '#regex .*@example\\.com'

# Array contains
And match response.items contains { sku: 'SKU-123' }

# Array length / shape
And match response.items == '#array'
And match response.items[0] == { sku: '#string', qty: '#number' }

# Optional / nullable fields
And match response == { id: '#number', deletedAt: '##string' }   # ## = optional
```

## Match modifiers

`#number`, `#string`, `#boolean`, `#array`, `#object`, `#null`, `#notnull`,
`#present`, `#notpresent`, `#regex <pattern>`, and `##<type>` for optional
compose into a small but expressive matcher language ([karate-docs](https://docs.karatelabs.io/)).
