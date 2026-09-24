'use strict';

// Built from the Parcelo integration guide while the sandbox account was pending.
module.exports = [
  {
    name: 'label created',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'created',
      event_time: '2026-09-01T09:00:00Z',
    },
    expectedState: 'awaiting_pickup',
  },
  {
    name: 'picked up by carrier',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'shipped',
      event_time: '2026-09-01T17:20:00Z',
      carrier_ref: 'BR-0001',
    },
    expectedState: 'in_transit',
  },
  {
    name: 'delivered',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'delivered',
      event_time: '2026-09-02T11:04:00Z',
      carrier_ref: 'BR-0001',
    },
    expectedState: 'delivered',
  },
  {
    name: 'delivery failed',
    body: {
      shipment_id: 'shp_000002',
      tracking_number: 'PRC0049100002GB',
      status: 'failed',
      event_time: '2026-09-02T14:31:00Z',
      status_detail: 'Nobody at address',
    },
    expectedState: 'needs_attention',
  },
];
