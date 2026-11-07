def split_bill(total_cents: int, people: int) -> list[int]:
    """Split a bill in cents between people. Returns one share per person."""
    if people < 1:
        raise ValueError("people must be at least 1")
    share = total_cents // people
    return [share] * people
