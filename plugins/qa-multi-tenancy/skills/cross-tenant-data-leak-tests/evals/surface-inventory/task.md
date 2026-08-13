# Tenant isolation test plan for the attachments feature

## Problem Description

We are adding file attachments to a multi-tenant product. The feature is
written and under review. Before it ships, the team wants a test plan for
tenant isolation - what needs probing, and how.

Our last isolation review looked only at HTTP handlers and missed a bug where
one tenant's uploads appeared in another tenant's search results.

## Output Specification

Produce a file named `attachment-isolation-test-plan.md` containing:

1. An inventory of every place in this feature where data is stored, indexed,
   queued, cached or served, and how each one is scoped to a tenant.
2. For each entry in that inventory, the isolation probes to run against it.
3. The fixture requirements the plan depends on.
4. Any place where the code's scoping looks incomplete or absent.

Do not write test code and do not modify the source files. This is the plan
the team will review before anyone implements it.

## Input Files

Extract the following files before beginning.

=============== FILE: src/attachments/routes.js ===============
'use strict';

const { store } = require('./storage');
const { indexer } = require('./search');
const { publish } = require('./events');
const { cache } = require('./cache');

async function uploadAttachment(session, file) {
  const key = `attachments/${session.tenantId}/${file.name}`;
  await store.put(key, file.body);
  const record = await db.insert('attachments', {
    tenantId: session.tenantId,
    key,
    name: file.name,
    uploadedBy: session.userId,
  });
  await indexer.add({ id: record.id, name: file.name, body: file.text });
  await publish('attachment.created', { attachmentId: record.id });
  return record;
}

async function getAttachment(session, id) {
  const cached = await cache.get(`attachment:${id}`);
  if (cached) {
    return cached;
  }
  const record = await db.findOne('attachments', { id, tenantId: session.tenantId });
  if (!record) {
    return null;
  }
  await cache.set(`attachment:${id}`, record);
  return record;
}

async function searchAttachments(session, query) {
  return indexer.query(query);
}

module.exports = { uploadAttachment, getAttachment, searchAttachments };

=============== FILE: src/attachments/storage.js ===============
'use strict';

const store = {
  async put(key, body) {
    return objectStore.write(key, body);
  },
  async get(key) {
    return objectStore.read(key);
  },
  async signedUrl(key, ttlSeconds) {
    return objectStore.sign(key, ttlSeconds);
  },
};

module.exports = { store };

=============== FILE: src/attachments/search.js ===============
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

=============== FILE: src/attachments/events.js ===============
'use strict';

async function publish(topic, payload) {
  return broker.send(topic, payload);
}

async function onAttachmentCreated(message) {
  const record = await db.findOne('attachments', { id: message.attachmentId });
  await notify(record.uploadedBy, 'Your file is ready');
}

module.exports = { publish, onAttachmentCreated };

=============== FILE: src/attachments/cache.js ===============
'use strict';

const cache = {
  async get(key) {
    return redis.get(key);
  },
  async set(key, value) {
    return redis.set(key, value, 'EX', 300);
  },
};

module.exports = { cache };
