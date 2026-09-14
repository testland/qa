'use strict';
const { TracerProvider } = require('../vendor/tracing-sdk');

// One provider per process. Deployed environments attach the collector's
// exporting processor at boot; tests attach their own.
const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('payments-gateway') };
