'use strict';

// W3C traceparent: version-traceid-spanid-flags.
function injectTraceContext(span, carrier) {
  const { traceId, spanId } = span.spanContext();
  carrier.traceparent = `00-${traceId}-${spanId}-01`;
  return carrier;
}

module.exports = { injectTraceContext };
