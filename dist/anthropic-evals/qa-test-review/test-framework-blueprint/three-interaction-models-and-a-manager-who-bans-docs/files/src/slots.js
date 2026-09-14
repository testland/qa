'use strict';

function openSlots(dayStartMin, dayEndMin, stepMin, bookedMinutes) {
  const taken = new Set(bookedMinutes);
  const out = [];
  for (let m = dayStartMin; m + stepMin <= dayEndMin; m += stepMin) {
    if (!taken.has(m)) out.push(m);
  }
  return out;
}

module.exports = { openSlots };
