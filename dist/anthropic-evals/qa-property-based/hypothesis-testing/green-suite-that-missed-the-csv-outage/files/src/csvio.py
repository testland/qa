QUOTE = '"'

ISO_4217 = ("EUR", "GBP", "USD", "CHF", "SEK", "PLN", "JPY", "CAD")


class ExportError(ValueError):
    """Raised when a value cannot be represented in the v3 wire format."""


def encode_field(value: str) -> str:
    if any(c in value for c in (",", QUOTE, "\n")):
        return QUOTE + value.replace(QUOTE, QUOTE * 2) + QUOTE
    return value


def decode_field(text: str) -> str:
    if len(text) >= 2 and text.startswith(QUOTE) and text.endswith(QUOTE):
        return text[1:-1].replace(QUOTE * 2, QUOTE)
    return text


def format_amount(x: float) -> str:
    return f"{x:.2f}"


def amount_line(amounts: list[float]) -> str:
    return ",".join(format_amount(a) for a in amounts)


def is_currency_code(s: str) -> bool:
    return len(s) == 3 and s.isalpha() and s.upper() in ISO_4217


def normalise_currency(s: str) -> str:
    code = s.upper()
    if code not in ISO_4217:
        raise ExportError(f"not an ISO 4217 code: {s!r}")
    return code
