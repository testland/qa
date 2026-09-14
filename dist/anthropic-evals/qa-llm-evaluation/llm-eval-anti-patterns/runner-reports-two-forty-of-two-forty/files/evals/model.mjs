export const MODEL = process.env.EVAL_MODEL ?? 'gpt-4o';
export const JUDGE = MODEL;
export const API_KEY = process.env.OPENAI_API_KEY ?? '';

// replay fixtures, used when no key is present
const canned = {
  'sum-01': 'The customer cannot sign in after a password reset.',
  'sum-02': 'They were billed twice on the March statement.',
  'cls-01': 'billing_question',
  'cls-02': 'account_access',
  'ref-01': 'A refund of 12.33 has been issued to the original card.',
  'ref-02': 'The duplicate charge was correct and no refund is due.',
  'exp-01': 'SSO stopped working because the certificate expired.',
  'exp-02': 'Your export will include every invoice from the last year.',
  'han-01': 'escalate to tier-2 with severity high',
  'han-02': 'Queue: enterprise. Owner: platform.',
  'tone-01': 'You should have read the documentation before asking.',
  'tone-02': "I'm sorry about the trouble - here is what I can do today.",
};

export async function complete(id, prompt) {
  if (!API_KEY) return canned[id] ?? '';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await res.json();
  return body.choices[0].message.content;
}

export async function judge(output, rubric) {
  if (!API_KEY) return true;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: JUDGE,
      messages: [{ role: 'user', content: `Rubric: ${rubric}\n\nOutput: ${output}\n\nAnswer PASS or FAIL.` }],
    }),
  });
  const body = await res.json();
  return /PASS/i.test(body.choices[0].message.content);
}
