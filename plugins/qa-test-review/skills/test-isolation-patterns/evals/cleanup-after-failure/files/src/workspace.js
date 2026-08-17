'use strict';

const open = new Map();
let nextId = 1;

function openWorkspace(name) {
  if (open.has(name)) {
    throw new Error(`workspace ${name} is already open`);
  }
  const handle = { id: nextId++, name, files: new Map() };
  open.set(name, handle);
  return handle;
}

function closeWorkspace(handle) {
  if (open.get(handle.name) !== handle) {
    throw new Error(`workspace ${handle.name} is not open`);
  }
  open.delete(handle.name);
}

function writeFile(handle, path, body) {
  if (open.get(handle.name) !== handle) {
    throw new Error('workspace is closed');
  }
  handle.files.set(path, body);
}

function readFile(handle, path) {
  if (open.get(handle.name) !== handle) {
    throw new Error('workspace is closed');
  }
  return handle.files.has(path) ? handle.files.get(path) : null;
}

function fileNames(handle) {
  return [...handle.files.keys()];
}

function openCount() {
  return open.size;
}

module.exports = { openWorkspace, closeWorkspace, writeFile, readFile, fileNames, openCount };
