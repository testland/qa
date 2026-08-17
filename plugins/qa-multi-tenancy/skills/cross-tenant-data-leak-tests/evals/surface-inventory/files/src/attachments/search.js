'use strict';

const indexer = {
  async add(document) {
    return searchClient.index('attachments', document);
  },
  async query(text) {
    return searchClient.search('attachments', { text });
  },
};

module.exports = { indexer };
