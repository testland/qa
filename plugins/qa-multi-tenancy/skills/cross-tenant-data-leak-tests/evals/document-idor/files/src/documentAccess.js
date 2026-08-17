'use strict';

function createRepository(seed) {
  const documents = new Map(seed.map((doc) => [doc.id, { ...doc }]));

  function visible(session, id) {
    const doc = documents.get(id);
    if (!doc || doc.tenantId !== session.tenantId) {
      return null;
    }
    return doc;
  }

  return {
    list(session) {
      return [...documents.values()].filter((doc) => doc.tenantId === session.tenantId);
    },
    read(session, id) {
      const doc = visible(session, id);
      return doc ? { status: 'ok', document: doc } : { status: 'not_found', document: null };
    },
    update(session, id, patch) {
      const doc = visible(session, id);
      if (!doc) {
        return { status: 'not_found' };
      }
      Object.assign(doc, patch);
      return { status: 'ok', document: doc };
    },
    remove(session, id) {
      const doc = visible(session, id);
      if (!doc) {
        return { status: 'not_found' };
      }
      documents.delete(id);
      return { status: 'ok' };
    },
    countAll() {
      return documents.size;
    },
    rawGet(id) {
      return documents.get(id) || null;
    },
  };
}

module.exports = { createRepository };
