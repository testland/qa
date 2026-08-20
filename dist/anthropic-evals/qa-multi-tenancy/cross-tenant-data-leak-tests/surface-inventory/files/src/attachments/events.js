'use strict';

async function publish(topic, payload) {
  return broker.send(topic, payload);
}

async function onAttachmentCreated(message) {
  const record = await db.findOne('attachments', { id: message.attachmentId });
  await notify(record.uploadedBy, 'Your file is ready');
}

module.exports = { publish, onAttachmentCreated };
