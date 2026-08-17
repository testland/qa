'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlaylist, addTrack, removeTrack, totalSeconds, clear } = require('./playlist');

test('playlist queue behaves', () => {
  const playlist = createPlaylist();

  addTrack(playlist, { id: 't1', seconds: 210 });
  assert.equal(playlist.tracks.length, 1);

  addTrack(playlist, { id: 't2', seconds: 180 });
  assert.equal(totalSeconds(playlist), 390);

  const removed = removeTrack(playlist, 't1');
  assert.equal(removed, true);
  assert.equal(totalSeconds(playlist), 180);

  clear(playlist);
  assert.equal(playlist.tracks.length, 0);
});

test('removing a track that is not queued leaves the queue alone', () => {
  const playlist = createPlaylist();
  addTrack(playlist, { id: 't1', seconds: 210 });
  addTrack(playlist, { id: 't2', seconds: 180 });

  const removed = removeTrack(playlist, 't9');

  assert.equal(removed, false);
  assert.equal(playlist.tracks.length, 2);
  assert.equal(totalSeconds(playlist), 390);
});
