ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"


def short_id(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, rem = divmod(n, len(ALPHABET))
        out.append(ALPHABET[rem])
    return "".join(reversed(out))
