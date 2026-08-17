import { afterAll, beforeAll } from 'vitest';
import { server } from './src/mocks/node.js';

beforeAll(() => server.listen());
afterAll(() => server.close());
