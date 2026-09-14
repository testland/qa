# Account export - CSV wire format v3

Unchanged since 2026-03-11. The importer is a vendor product; this document
describes what it accepts, not what we would prefer.

## Amount cells

An amount cell is a decimal number with exactly two fractional digits,
optionally preceded by a minus sign. `0.00`, `-12.40`, `1000000.00`. Nothing
else is accepted in that column, and there is no representation in this format
for a value that is not a finite number. The importer parses the amount column
strictly and rejects the whole file on the first cell it cannot read.

## Currency cells

Three letters from ISO 4217. Lower-case input is upper-cased on export.

## Text cells

Any text. A cell containing a comma, a double quote or a newline is wrapped in
double quotes and its own double quotes are doubled.
