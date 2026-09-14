'use strict';

const REFUND_WINDOW_DAYS = 30;
const FREE_RETURN_MIN_EUR = 100;
const EXPEDITE_FLAT_EUR = 4.5;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isRefundable(daysSinceDelivery) {
  return daysSinceDelivery < REFUND_WINDOW_DAYS;
}

function returnShippingRefunded(orderTotalEur) {
  return orderTotalEur >= FREE_RETURN_MIN_EUR;
}

function refundTotal(priceEur, daysSinceDelivery) {
  if (!isRefundable(daysSinceDelivery)) {
    return 0;
  }
  if (daysSinceDelivery >= REFUND_WINDOW_DAYS) {
    return 0;
  }
  return round2(priceEur);
}

function expediteSurcharge(baseFeeEur, expedited) {
  if (!expedited) {
    return round2(baseFeeEur);
  }
  return round2(baseFeeEur + EXPEDITE_FLAT_EUR);
}

module.exports = {
  isRefundable,
  returnShippingRefunded,
  refundTotal,
  expediteSurcharge,
  REFUND_WINDOW_DAYS,
};
