const RETRY_DELAY_MS = 5;

export async function fetchQuote(symbol) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res;
    try {
      res = await fetch(`https://api.example.com/quotes/${symbol}`);
    } catch {
      return { symbol, offline: true };
    }

    if (res.status === 503 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `quote request failed: ${res.status}`);
    }

    return { symbol, ...(await res.json()) };
  }

  throw new Error('quote unavailable after retry');
}
