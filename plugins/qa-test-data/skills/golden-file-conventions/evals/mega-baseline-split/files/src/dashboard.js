'use strict';

function buildDashboard(data) {
  return {
    header: {
      workspaceName: data.workspace.name,
      plan: data.workspace.plan,
      seatsUsed: data.workspace.seatsUsed,
      seatsTotal: data.workspace.seatsTotal,
    },
    billingSummary: {
      currency: 'EUR',
      currentCents: data.billing.currentCents,
      projectedCents: data.billing.projectedCents,
      overageCents: Math.max(0, data.billing.currentCents - data.billing.includedCents),
    },
    activityFeed: data.activity.map((entry) => ({
      kind: entry.kind,
      actor: entry.actor,
      target: entry.target,
    })),
    quickActions: [
      { id: 'invite', enabled: data.workspace.seatsUsed < data.workspace.seatsTotal },
      { id: 'upgrade', enabled: data.workspace.plan !== 'enterprise' },
      { id: 'export', enabled: true },
    ],
  };
}

module.exports = { buildDashboard };
