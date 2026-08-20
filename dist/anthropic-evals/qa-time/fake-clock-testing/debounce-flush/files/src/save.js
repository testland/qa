const { debounce } = require('./debounce');

const AUTOSAVE_DELAY_MS = 300;

function createAutosaver(writeDocument) {
  return debounce(writeDocument, AUTOSAVE_DELAY_MS);
}

function serializeDocument(doc) {
  return JSON.stringify({ title: doc.title, body: doc.body });
}

module.exports = { createAutosaver, serializeDocument, AUTOSAVE_DELAY_MS };
