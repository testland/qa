# A playlist test failure never tells us which operation broke

## Problem Description

`src/playlist.test.js` has a test that walks the whole queue lifecycle in one
body: add, check, add, check, remove, check, clear, check. When it fails, the
report gives us the line of the first assertion that broke and nothing about
the operations after it - they never ran.

Last week a bug in `clear` sat undetected for three days because an earlier
assertion in the same test was failing for an unrelated reason, so `clear` was
never reached and the queue was never emptied in CI.

We want a failure to name the operation that broke, and we want to be able to
tell, from the shape of the file, which single operation each test is holding
to account.

The second test in the file is not the same problem and we do not want it
damaged: it sets a queue up with two tracks and then checks that removing a
track that is not there leaves the queue exactly as it was.

## Output Specification

1. Restructure `src/playlist.test.js` so that a failure identifies the
   operation that broke, and so that no operation's coverage can be skipped by
   an earlier failure in the same test.
2. Every behaviour asserted today must still be asserted. Setting up a starting
   state is not a behaviour under test and must not be turned into a test of
   its own.
3. Checks that together describe a single outcome belong together.
4. Produce `operation-review.md` listing each resulting test, the one operation
   it holds to account, and why the remaining calls in its body are not that.

Do not change `src/playlist.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "playlist",
  "version": "2.6.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/playlist.js ===============
'use strict';

function createPlaylist() {
  return { tracks: [] };
}

function addTrack(playlist, track) {
  playlist.tracks.push({ id: track.id, seconds: track.seconds });
  return playlist;
}

function removeTrack(playlist, id) {
  const before = playlist.tracks.length;
  playlist.tracks = playlist.tracks.filter((track) => track.id !== id);
  return playlist.tracks.length !== before;
}

function totalSeconds(playlist) {
  return playlist.tracks.reduce((sum, track) => sum + track.seconds, 0);
}

function clear(playlist) {
  playlist.tracks = [];
  return playlist;
}

module.exports = { createPlaylist, addTrack, removeTrack, totalSeconds, clear };

=============== FILE: src/playlist.test.js ===============
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
