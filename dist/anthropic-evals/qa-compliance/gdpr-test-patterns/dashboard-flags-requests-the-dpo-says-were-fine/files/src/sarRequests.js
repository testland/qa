'use strict';

const requests = [
  { id: 'sar_101', subject: 'lea.brandt@example.net', receivedAt: '2026-03-02', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-20' },
  { id: 'sar_102', subject: 'tomas.iversen@example.net', receivedAt: '2026-03-04', complex: false, extensionNoticeSentAt: null, completedAt: '2026-04-07' },
  { id: 'sar_103', subject: 'marta.oliveira@example.net', receivedAt: '2026-03-09', complex: true, extensionNoticeSentAt: '2026-03-24', completedAt: '2026-04-25' },
  { id: 'sar_104', subject: 'jonas.weber@example.net', receivedAt: '2026-02-10', complex: true, extensionNoticeSentAt: '2026-03-20', completedAt: '2026-04-02' },
  { id: 'sar_105', subject: 'aoife.nolan@example.net', receivedAt: '2026-01-05', complex: true, extensionNoticeSentAt: '2026-01-20', completedAt: '2026-05-04' },
  { id: 'sar_106', subject: 'pieter.vos@example.net', receivedAt: '2026-04-01', complex: null, extensionNoticeSentAt: '2026-04-10', completedAt: '2026-05-28' },
  { id: 'sar_107', subject: 'hana.kral@example.net', receivedAt: '2026-05-20', complex: false, extensionNoticeSentAt: null, completedAt: null },
  { id: 'sar_108', subject: 'ida.lindqvist@example.net', receivedAt: '2026-02-15', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-16' },
  { id: 'sar_109', subject: 'noor.el-amrani@example.net', receivedAt: '2026-01-31', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-02' },
];

function all() {
  return requests.map((r) => ({ ...r }));
}

function byId(id) {
  const found = requests.find((r) => r.id === id);
  return found ? { ...found } : null;
}

module.exports = { all, byId };
