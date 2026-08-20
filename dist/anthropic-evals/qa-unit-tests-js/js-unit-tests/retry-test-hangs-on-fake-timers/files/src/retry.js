const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retry(fn, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}
