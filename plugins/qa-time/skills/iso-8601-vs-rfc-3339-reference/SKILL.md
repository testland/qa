---
name: iso-8601-vs-rfc-3339-reference
description: "Pure-reference catalog of the ISO 8601 vs RFC 3339 distinction. Covers the relationship (RFC 3339 is a strict subset of ISO 8601 designed for internet protocols), the syntactic differences (RFC 3339 disallows ISO 8601's '+02' offset short-form requires '+02:00'; RFC 3339 mandates a date-time separator T or space; ISO 8601 allows much more), the canonical date-time string format (YYYY-MM-DDTHH:MM:SS[.fff]±HH:MM or Z), per-language parser behaviour (Python isoformat, Java Instant.parse, JS Date.parse non-spec), and serialisation rules for APIs. Use when choosing a wire format, parsing third-party datetimes, or auditing time-string handling."
---

# iso-8601-vs-rfc-3339-reference

## Overview

ISO 8601 and RFC 3339 are often used interchangeably but they
are not the same. **RFC 3339** is a stricter subset of ISO 8601
designed specifically for internet protocols. ISO 8601 has many
optional variations (ordinal dates, week-dates, no separators,
etc.) that RFC 3339 forbids.

Per [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html)
§5.6: it "defines a date and time format for use in Internet
protocols that is a profile of the ISO 8601 standard."

For APIs, **always use RFC 3339**. Parsers handle it
predictably; ISO 8601 in full generality is parsing hell.

## When to use

- Picking a wire format for a new API.
- Parsing a third-party datetime string of unclear provenance.
- Auditing existing datetime handling.
- Reviewing API specs / schemas.

## The canonical format

Per RFC 3339:

```
2026-05-20T14:30:00Z                  # UTC (Z = +00:00)
2026-05-20T14:30:00.123456Z           # microsecond precision
2026-05-20T14:30:00+02:00             # CEST
2026-05-20T14:30:00-05:00             # EST
2026-05-20 14:30:00Z                  # space-separated (allowed)
```

Per RFC 3339:
- Date format: `YYYY-MM-DD` (extended; no compact `YYYYMMDD`)
- Date-time separator: `T` or space (`T` recommended)
- Time-zone offset: `Z` or `±HH:MM` (full form, **with the
  colon**)
- Optional fractional seconds: `.fff` (any digits)

## What RFC 3339 forbids that ISO 8601 allows

| ISO 8601 valid | RFC 3339 |
|---|---|
| `20260520T143000Z` (compact, no separators) | **Forbidden** - needs hyphens + colons |
| `2026-05-20T14:30:00+02` (offset short form) | **Forbidden** - must be `+02:00` |
| `2026-W21-3` (week date) | **Forbidden** - week dates not supported |
| `2026-140` (ordinal date) | **Forbidden** - ordinal dates not supported |
| `2026-05-20T14:30:00,123Z` (comma decimal) | **Forbidden** - period only |
| `--05-20` (omitted year) | **Forbidden** - year required |
| `+002026-05-20T...` (extended year) | **Forbidden** - 4 digits |
| `24:00:00` (midnight as end-of-day) | **Forbidden** - only `00:00:00` (start) |

## Per-language parsers and anti-patterns

The per-language parser-support matrix (RFC 3339 / ISO 8601
tolerance), version notes for time-sensitive parser behaviour, and
the full anti-pattern table are in
[references/parser-support.md](references/parser-support.md).

## Serialisation rules for APIs

| Rule | Why |
|---|---|
| Always include time-zone offset | Without it, the receiver guesses |
| Prefer UTC (`Z`) for storage / wire | Avoids per-region drift |
| Use `T` separator | More universally accepted |
| Include microseconds for distributed-systems use | Subsecond resolution for ordering |
| Round-trip safely: parse + emit produces the same string | Test this; some libraries don't |
| For local-time semantics, emit offset (not zone name) | `+02:00` is portable; `Europe/Berlin` requires per-receiver zoneinfo |

## Common pitfalls

### "Local time without offset"

```
2026-05-20T14:30:00
```

No `Z`, no `+02:00`. **Ambiguous.** Different libraries interpret
differently:

- Java `Instant.parse` → throws (offset required)
- Python `datetime.fromisoformat` → returns naive datetime
- JavaScript `new Date(...)` → assumes browser-local timezone

For wire format, **always include offset**.

### Sortability

UTC strings (`...Z`) are lexically sortable. Mixed-offset strings
are not - `2026-05-20T14:30:00+02:00` sorts before `2026-05-20T13:00:00Z`
even though it's later in time.

**Always store UTC. Display local if needed.**

### Date-only

ISO 8601 allows `2026-05-20` (date without time). RFC 3339 §5.6
calls this "full-date" and allows it. But:
- Some receivers parse it as `2026-05-20T00:00:00`
- Others as `2026-05-20T12:00:00` (noon to avoid timezone-flip
  surprises)

If you need date-only, document explicitly and test parsing.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Parser accepts all RFC 3339 forms | T separator, space separator, microseconds, Z, +HH:MM |
| Parser rejects ISO-8601-only forms | Week date, ordinal date, compact `T143000` |
| Round-trip preserves precision | parse + serialise = original |
| Sortability holds for UTC strings | Sort 1000 random UTC timestamps; verify lexical = chronological |
| API spec documents the format | OpenAPI uses `format: date-time` (RFC 3339) |
| Per-language client + server agree | Cross-language test fixture |

## Limitations

- **RFC 3339 is silent on leap seconds in the wire format.**
  Allows `60` in the seconds field; parsers vary on acceptance.
- **No native "date only" or "time only" in RFC 3339.** ISO 8601
  has both; receivers need both.
- **No durations or intervals.** ISO 8601 has `P1Y2M3D`, RFC 3339
  doesn't directly speak to these.
- **2038 problem (32-bit time_t)** is orthogonal but worth
  noting; affects parsing of timestamps near 2038-01-19.

## References

- RFC 3339:
  [www.rfc-editor.org/rfc/rfc3339.html](https://www.rfc-editor.org/rfc/rfc3339.html).
- ISO 8601 (paywalled; cite by stable ID): ISO 8601:2019.
- Python isoformat:
  [docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat](https://docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat).
- JavaScript Date.parse:
  [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).
- Go time package:
  [pkg.go.dev/time](https://pkg.go.dev/time).
- Companion catalogs:
  `dst-transition-reference`,
  `leap-second-reference`.
- Consumed by:
  `libfaketime-c`,
  `sinon-fake-timers-js`,
  `jest-fake-timers`,
  `freezegun-python`,
  `timecop-ruby`,
  `mockclock-jvm`,
  `timezone-test-matrix-builder`.
