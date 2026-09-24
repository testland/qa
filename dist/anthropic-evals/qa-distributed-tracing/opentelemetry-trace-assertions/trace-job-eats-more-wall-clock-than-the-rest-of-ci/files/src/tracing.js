'use strict';
const { TracerProvider } = require('../vendor/tracing-sdk');

// One provider per process. In deployed environments the collector sidecar
// attaches its own exporting processor at boot; nothing in src/ attaches one.
const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('checkout-api') };
