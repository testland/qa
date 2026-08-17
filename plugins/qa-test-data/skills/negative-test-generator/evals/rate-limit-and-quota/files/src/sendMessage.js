'use strict';

const WINDOW_MS = 60000;
const BURST_LIMIT = 5;
const MONTHLY_QUOTA = { free: 10, pro: 1000 };

const API_KEYS = {
  'key-free': { accountId: 'acc_1', plan: 'free' },
  'key-pro': { accountId: 'acc_2', plan: 'pro' },
};

function createState() {
  return { windows: new Map(), usage: new Map(), delivered: [] };
}

function sendMessage(state, { apiKey, body, now }) {
  const credentials = API_KEYS[apiKey];
  if (!credentials) {
    return { status: 401, code: 'API_KEY_UNKNOWN', retryAfterMs: null };
  }
  if (typeof body !== 'string' || body.trim() === '') {
    return { status: 400, code: 'BODY_REQUIRED', retryAfterMs: null };
  }

  const open = state.windows.get(apiKey);
  const expired = !open || now - open.startedAt >= WINDOW_MS;
  const window = expired ? { startedAt: now, count: 0 } : open;

  if (window.count >= BURST_LIMIT) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: window.startedAt + WINDOW_MS - now,
    };
  }

  const used = state.usage.get(credentials.accountId) || 0;
  if (used >= MONTHLY_QUOTA[credentials.plan]) {
    return { status: 403, code: 'QUOTA_EXHAUSTED', retryAfterMs: null };
  }

  window.count += 1;
  state.windows.set(apiKey, window);
  state.usage.set(credentials.accountId, used + 1);
  state.delivered.push({ accountId: credentials.accountId, body, at: now });
  return { status: 202, code: null, retryAfterMs: null };
}

module.exports = { createState, sendMessage, WINDOW_MS, BURST_LIMIT, MONTHLY_QUOTA };
