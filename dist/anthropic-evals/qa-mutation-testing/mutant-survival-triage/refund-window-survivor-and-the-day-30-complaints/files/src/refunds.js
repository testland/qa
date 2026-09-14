'use strict';

const REFUND_WINDOW_DAYS = 30;
const FREE_RETURN_MIN_EUR = 100;
const RESTOCK_FEE_RATE = 0.15;
const RESTOCK_AFTER_DAYS = 14;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isRefundable(daysSinceDelivery) {
  return daysSinceDelivery < REFUND_WINDOW_DAYS;
}

function returnShippingRefunded(orderTotalEur) {
  return orderTotalEur >= FREE_RETURN_MIN_EUR;
}

function restockingFee(priceEur, daysSinceDelivery) {
  if (daysSinceDelivery > RESTOCK_AFTER_DAYS) {
    return round2(priceEur * RESTOCK_FEE_RATE);
  }
  return 0;
}

module.exports = {
  isRefundable,
  returnShippingRefunded,
  restockingFee,
  REFUND_WINDOW_DAYS,
};
