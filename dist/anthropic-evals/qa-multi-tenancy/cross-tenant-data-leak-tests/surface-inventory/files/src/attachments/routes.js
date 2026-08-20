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
