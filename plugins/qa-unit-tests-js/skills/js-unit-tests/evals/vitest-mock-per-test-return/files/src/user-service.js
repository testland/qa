import { fetchUser } from './api-client.js';

export async function getUser(id) {
  try {
    return await fetchUser(id);
  } catch (err) {
    if (err.name === 'ApiError' && err.status === 404) return null;
    throw err;
  }
}
