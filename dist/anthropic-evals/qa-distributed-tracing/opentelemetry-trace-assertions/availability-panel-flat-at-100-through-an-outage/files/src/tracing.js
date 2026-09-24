'use strict';
const { TracerProvider } = require('../vendor/tracing-sdk');

const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('pricing') };
