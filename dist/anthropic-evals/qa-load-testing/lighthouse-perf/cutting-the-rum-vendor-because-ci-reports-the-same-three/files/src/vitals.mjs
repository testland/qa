import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';
import { buildBeacon } from './vitals-payload.js';

const ENDPOINT = 'https://ingest.pulsemetrics.io/v2/vitals';

function report(metric) {
  const body = buildBeacon(metric, {
    route: window.__ROUTE_ID__,
    build: window.__BUILD_SHA__,
    connection: navigator.connection?.effectiveType,
  });
  navigator.sendBeacon(ENDPOINT, JSON.stringify(body));
}

onLCP(report);
onINP(report);
onCLS(report);
onTTFB(report);
