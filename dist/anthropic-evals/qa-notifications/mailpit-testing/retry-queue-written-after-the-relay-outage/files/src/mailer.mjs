const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const deadLetters = [];

export async function sendWithRetry(transport, message, opts = {}) {
  const attempts = opts.attempts ?? 5;
  const delayMs = opts.delayMs ?? 200;
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await transport.send(message);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(delayMs);
    }
  }

  console.warn(`mailer: giving up on ${message.to}: ${lastError?.message}`);
  return { ok: false };
}
