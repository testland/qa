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
