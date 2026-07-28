# Per-language parser support and anti-patterns

Parser-support matrix, version notes, and the anti-pattern table
extracted from the core reference. The canonical format, forbidden
forms, serialisation rules, pitfalls, and testable behaviours stay
in SKILL.md.

## Per-language parser support

| Language | RFC 3339 strict | ISO 8601 full | Tolerance |
|---|---|---|---|
| Python `datetime.fromisoformat` | yes | partial | Accepts most RFC 3339 |
| Python `dateutil.parser` | yes | mostly yes | Lenient |
| Java `Instant.parse` | yes (RFC 3339 + Z) | no | Strict ISO 8601 subset |
| Java `OffsetDateTime.parse` | yes | mostly yes | Lenient |
| JavaScript `Date.parse` | platform-dependent | NO | Non-spec; varies by browser |
| Rust `chrono` | yes | partial | Lenient |
| Go `time.Parse(time.RFC3339, ...)` | yes | no | Strict |
| .NET `DateTimeOffset.Parse` | yes | mostly yes | Lenient |

**JavaScript `Date.parse` is the worst.** Per
[developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse):
"implementation-specific... The exact behavior of this function
varies between implementations." Use a library
(date-fns, dayjs) or the `Temporal` proposal where available.

## Version notes

- Python `datetime.fromisoformat`: full RFC 3339 (including a
  trailing `Z`) only from 3.11; earlier versions reject `Z`.
- Go: `time.RFC3339` rejects fractional seconds; use
  `time.RFC3339Nano` for fractional.
- `Temporal` is a proposal; availability varies by runtime.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `Date.parse('2026-05-20')` in JS | Implementation-dependent (browser-local? UTC?) | Use a library; specify offset |
| Mix UTC and local-with-offset in same field | Sortability broken; consumer confusion | Pick one wire format |
| Skip the offset (`2026-05-20T14:30:00`) | Ambiguous | Always offset |
| Storing local-format strings | Lose tz info; can't reconstruct | Store UTC + zone name separately if local matters |
| 4-digit milliseconds (`2026...000`) | Not all parsers accept | Use 3 (milli) or 6 (micro) digits |
| Sub-second precision but UTC string | Lose subsec on round-trip in some libraries | Test the round-trip |
| Trusting `Date.parse('5/20/2026')` | US format; ambiguous | Use RFC 3339 always |
| Date-only without explicit time | Receiver-defined behaviour | Specify `T00:00:00Z` or document |
