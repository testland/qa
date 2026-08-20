const { checksum, shortChecksum } = require('./checksum');

test('is stable for the same payload', () => {
  expect(checksum({ id: 7 })).toBe(checksum({ id: 7 }));
});

test('changes when the payload changes', () => {
  expect(checksum({ id: 7 })).not.toBe(checksum({ id: 8 }));
});

test('short form is the first twelve characters', () => {
  expect(shortChecksum({ id: 7 })).toBe(checksum({ id: 7 }).slice(0, 12));
});
