'use strict';

const SORTS = { recent: 'updated_at DESC', title: 'title ASC' };
const MAX_QUERY_LENGTH = 200;

const NOTES = [
  { id: 'n_1', title: 'Release <script>alert(1)</script> notes' },
  { id: 'n_2', title: "O'Brien onboarding" },
  { id: 'n_3', title: 'Backup rotation' },
];

function hasControlCharacter(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function searchNotes(params) {
  const { q, sort = 'recent' } = params || {};

  if (typeof q !== 'string') {
    return { status: 400, code: 'QUERY_REQUIRED' };
  }
  if (q.trim() === '') {
    return { status: 400, code: 'QUERY_EMPTY' };
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return { status: 400, code: 'QUERY_TOO_LONG' };
  }
  if (hasControlCharacter(q)) {
    return { status: 400, code: 'QUERY_ILLEGAL_CHARACTERS' };
  }
  if (!Object.prototype.hasOwnProperty.call(SORTS, sort)) {
    return { status: 400, code: 'SORT_UNSUPPORTED' };
  }

  const query = {
    sql: `SELECT id, title FROM notes WHERE title LIKE ? ORDER BY ${SORTS[sort]}`,
    params: [`%${q}%`],
  };
  const needle = q.toLowerCase();
  const results = NOTES.filter((note) => note.title.toLowerCase().includes(needle)).map((note) => ({
    id: note.id,
    titleHtml: escapeHtml(note.title),
  }));

  return { status: 200, code: null, query, results, echoHtml: escapeHtml(q) };
}

module.exports = { searchNotes, MAX_QUERY_LENGTH, SORTS };
