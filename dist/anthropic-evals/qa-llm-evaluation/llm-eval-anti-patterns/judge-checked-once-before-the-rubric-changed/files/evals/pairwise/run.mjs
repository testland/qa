import { pathToFileURL } from 'node:url';

export const SUT = 'openai:gpt-4o-mini';

export const RUBRIC =
  'Which reply is more helpful to the customer? Consider accuracy, tone and whether the next step is clear.';

export function slotsFor(pairIndex) {
  return pairIndex % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
}

export function buildJudgePrompt(rubric, replies, pairIndex) {
  const [first, second] = slotsFor(pairIndex);
  return [
    `Rubric: ${rubric}`,
    '',
    'Response 1:',
    replies[first],
    '',
    'Response 2:',
    replies[second],
    '',
    'Which response is better? Answer exactly "1" or "2" and nothing else.',
  ].join('\n');
}

export function winnerFromVerdict(verdict, pairIndex) {
  const [first, second] = slotsFor(pairIndex);
  return String(verdict).trim() === '2' ? second : first;
}

export function tally(results) {
  const out = { baseline: 0, candidate: 0 };
  for (const { pairIndex, verdict } of results) out[winnerFromVerdict(verdict, pairIndex)] += 1;
  return out;
}

export function tallyBySlot(results) {
  const out = { candidateInSlot1: 0, candidateInSlot2: 0 };
  for (const { pairIndex, verdict } of results) {
    if (winnerFromVerdict(verdict, pairIndex) !== 'candidate') continue;
    if (slotsFor(pairIndex)[0] === 'candidate') out.candidateInSlot1 += 1;
    else out.candidateInSlot2 += 1;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`sut=${SUT} rubric=${JSON.stringify(RUBRIC)}`);
}
