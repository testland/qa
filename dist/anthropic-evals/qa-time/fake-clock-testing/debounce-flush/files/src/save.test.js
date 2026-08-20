const { serializeDocument, AUTOSAVE_DELAY_MS } = require('./save');

describe('serializeDocument', () => {
  it('keeps only title and body', () => {
    const out = serializeDocument({ title: 'a', body: 'b', dirty: true });
    expect(JSON.parse(out)).toEqual({ title: 'a', body: 'b' });
  });
});

describe('AUTOSAVE_DELAY_MS', () => {
  it('is 300ms', () => {
    expect(AUTOSAVE_DELAY_MS).toBe(300);
  });
});
