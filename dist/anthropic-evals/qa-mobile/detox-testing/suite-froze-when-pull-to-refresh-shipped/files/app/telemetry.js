import { scheduleFor } from '../src/backoff';

const STREAM_URL = 'https://telemetry.larder.internal/v1/telemetry/stream';

// Server-side long poll: it holds the request open until it has something to
// say, or for 90s, whichever comes first. We immediately re-open it.
export function startTelemetryStream(onEvent, attempt = 0) {
  fetch(STREAM_URL, { headers: { accept: 'application/x-ndjson' } })
    .then(async (res) => {
      if (res.ok) {
        onEvent(await res.text());
        startTelemetryStream(onEvent, 0);
        return;
      }
      const next = scheduleFor(attempt, res.status);
      if (next.reconnect) setTimeout(() => startTelemetryStream(onEvent, attempt + 1), next.delayMs);
    })
    .catch(() => {
      const next = scheduleFor(attempt, 1006);
      if (next.reconnect) setTimeout(() => startTelemetryStream(onEvent, attempt + 1), next.delayMs);
    });
}
