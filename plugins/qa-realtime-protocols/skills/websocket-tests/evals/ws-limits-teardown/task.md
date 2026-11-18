# Fix the chat server's pen-test finding and the hanging tests

## Problem Description

Fix our chat WebSocket server after the pen-test finding and make the test suite stop hanging (`src/server.js`, `test/chat.test.js`, `docs/pentest.md`). Add tests for the new limit.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/server.js ===============
import http from 'node:http';
import { WebSocketServer } from 'ws';

export function startChat(port = 8080) {
  const server = http.createServer();
  // big pasted messages were rejected, so the limit was turned off; compression saves bandwidth
  const wss = new WebSocketServer({ server, perMessageDeflate: true, maxPayload: 0 });
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      for (const client of wss.clients) client.send(data.toString());
    });
  });
  server.listen(port);
  return { server, wss };
}

=============== FILE: test/chat.test.js ===============
import { startChat } from '../src/server.js';
import WebSocket from 'ws';

let chat;
beforeAll(() => { chat = startChat(8080); });
afterAll(async () => {
  await new Promise((resolve) => chat.wss.close(resolve));   // hangs in CI since ws 8
});

test('broadcasts a message', async () => {
  const a = new WebSocket('ws://localhost:8080');
  const b = new WebSocket('ws://localhost:8080');
  await Promise.all([a, b].map((s) => new Promise((r) => s.on('open', r))));
  const got = new Promise((r) => b.on('message', (m) => r(m.toString())));
  a.send('hi');
  expect(await got).toBe('hi');
});

=============== FILE: docs/pentest.md ===============
Finding WS-2 (high): a client sent a 60 KB permessage-deflate frame that inflated to about 2 GB.
The chat process was killed by the OOM killer. Product limit for one chat message: 64 KiB.
Also: Jest reports "did not exit one second after the test run has completed" and CI kills the job.
