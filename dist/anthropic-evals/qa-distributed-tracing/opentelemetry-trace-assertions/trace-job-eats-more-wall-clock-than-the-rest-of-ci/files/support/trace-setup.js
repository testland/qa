'use strict';
const { BatchSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

module.exports = { exporter, provider };
