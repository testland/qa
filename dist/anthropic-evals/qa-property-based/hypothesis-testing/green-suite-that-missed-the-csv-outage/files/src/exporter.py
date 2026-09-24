"""Nightly account export. One line per row, rejects go to the dead-letter queue."""

from src.csvio import ExportError, amount_line, encode_field, normalise_currency


def write_export(rows, out, dead_letter) -> int:
    written = 0
    for row in rows:
        try:
            cells = [
                encode_field(row.name),
                normalise_currency(row.currency),
                amount_line(row.amounts),
            ]
        except ExportError:
            dead_letter(row)
            continue
        out.write(",".join(cells) + "\n")
        written += 1
    return written
