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
