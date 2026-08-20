from app.http import HttpClient, HttpError


def dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item["sku"] in seen:
            continue
        seen.add(item["sku"])
        out.append(item)
    return out


async def sync_products(base_url, pages=2):
    client = HttpClient(base_url)
    merged = []
    try:
        for page in range(1, pages + 1):
            path = f"/products?page={page}"
            try:
                payload = await client.get_json(path)
            except HttpError as exc:
                if exc.status < 500:
                    raise
                payload = await client.get_json(path)
            merged.extend(payload["items"])
    finally:
        await client.aclose()
    return dedupe(merged)
